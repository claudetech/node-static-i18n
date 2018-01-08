fs      = require 'fs-extra'
cheerio = require 'cheerio'
_       = require 'lodash'
i18n    = require 'i18next'
async   = require 'async'
path    = require 'path'
glob    = require 'glob'
yaml    = require 'js-yaml'
S       = require 'string'

defaults =
  selector: '[data-t]'
  attrSelector: '[data-attr-t]',
  interpolateSelector: '[data-t-interpolate]',
  attrInterpolateSelector: '[data-attr-t-interpolate]',
  xml: false
  useAttr: true
  replace: false
  locales: ['en']
  fixPaths: true
  locale: 'en'
  files: '**/*.html'
  baseDir: process.cwd()
  removeAttr: true
  outputDir: undefined
  attrSuffix: '-t'
  attrInterpolateSuffix: '-t-interpolate'
  allowHtml: false
  exclude: []
  fileFormat: 'json'
  localeFile: '__lng__.__fmt__'
  outputDefault: '__file__'
  outputOther: '__lng__/__file__'
  localesPath: 'locales'
  outputOverride: {}
  encoding: 'utf8'
  translateConditionalComments: false
  i18n:
    resGetPath: 'locales/__lng__.json'
    setJqueryExt: false

absolutePathRegex = new RegExp('^(?:[a-z]+:)?//', 'i')
conditionalCommentRegex = /(\s*\[if .*?\]\s*>\s*)(.*?)(\s*<!\s*\[endif\]\s*)/i
closingTagRegex = /<\/.+?>/g

parseTranslations = (format, rawTranslations, callback) ->
  switch format
    when '.yml', '.yaml'
      try
        callback null, yaml.load(rawTranslations)
      catch e
        callback e
    when '.json'
      try
        callback null, JSON.parse(rawTranslations)
      catch e
        callback e
    else
      callback {message: 'unknown format'}

loadResources = (locale, options, callback) ->
  file = path.join(options.localesPath, options.localeFile).replace('__lng__', locale)
  extension =  path.extname file
  fs.readFile file, options.encoding, (err, data) ->
    return callback(err) if err
    parseTranslations extension, data, callback

getOptions = (baseOptions) ->
  options = _.merge {}, defaults, baseOptions
  options.localeFile = options.localeFile.replace('__fmt__', options.fileFormat)
  unless baseOptions?.i18n?.resGetPath
    if path.extname(options.localeFile) == '.json'
      options.i18n.resGetPath = path.join options.localesPath, options.localeFile
    else
      options.i18n.resGetPath = path.join options.localesPath, '__lng__.json'
  unless baseOptions?.i18n?.lng
    options.i18n.lng = options.locale
  if _.isUndefined(baseOptions?.outputDir)
    options.outputDir = path.join(process.cwd(), 'i18n')
  options

getOutput = (file, locale, options, absolute=true) ->
  if options.outputOverride?[locale]?[file]
    output = options.outputOverride[locale][file]
  else if locale == options.locale
    output = options.outputDefault
  else
    output = options.outputOther
  outputFile = output.replace('__lng__', locale).replace('__file__', file)
  if absolute
    outdir = if _.isString(options.outputDir) then options.outputDir else options.baseDir
    path.join outdir, outputFile
  else
    outputFile

translateAttributes = ($elem, options, t) ->
  selectorAttr = /^\[(.*?)\]$/.exec(options.attrSelector)?[1]
  selectorInterpolateAttr = /^\[(.*?)\]$/.exec(options.attrInterpolateSelector)?[1]
  interpolate = false
  _.each $elem.attr(), (v, k) ->
    if S(k).endsWith(options.attrInterpolateSuffix)
      interpolate = true
  _.each $elem.attr(), (v, k) ->
    return if _.isEmpty(v) || k == selectorAttr
    if S(k).endsWith(options.attrSuffix)
      isData = options.useAttr && k == /^\[(.*?)\]$/.exec(options.selector)?[1]
      attr = if isData then k else S(k).chompRight(options.attrSuffix).s
      trans = t(v)
      if interpolate
        trans = v.replace /{{([^{}]*)}}/g, (aa, bb) ->
          return t(bb)
      $elem.attr(attr, trans)
      $elem.attr(k, null) if options.removeAttr && !isData
  $elem.attr(selectorAttr, null) if selectorAttr? && options.removeAttr
  $elem.attr(selectorInterpolateAttr, null) if selectorInterpolateAttr?

translateElem = ($, elem, options, t) ->
  $elem = $(elem)
  if options.useAttr
  [
    options.selector
    options.interpolateSelector
  ].forEach (selectorString) ->
    if attr = /^\[(.*?)\]$/.exec(selectorString)
      key = $elem.attr(attr[1])
      if options.removeAttr
        $elem.attr attr[1], null
  key = $elem.text() if _.isEmpty(key)
  return if _.isEmpty(key)
  trans = t(key)
  if options.replace
    $elem.replaceWith trans
  else
    interpolateAttr = /^\[(.*?)\]$/.exec(options.interpolateSelector)?[1]
    interpolate = $elem.filter(options.interpolateSelector).length
    if interpolate
      trans = trans.replace /{{([^{}]*)}}/g, (aa, bb) ->
        return t(bb)
    if options.allowHtml
      if interpolate
        $elem.html($elem.html().replace /{{([^{}]*)}}/g, (aa, bb) ->
          return t(bb))
      else
        $elem.html(trans)
    else
      $elem.text(trans)
    $elem.attr(interpolateAttr, null) if options.removeAttr && interpolate

getPath = (fpath, locale, options) ->
  filepath = path.relative(options.baseDir, options.file)
  output = getOutput filepath, locale, options, false
  diff = path.relative(path.dirname(output), '')
  if _.isEmpty(diff) then fpath else "#{diff}/#{fpath}"

fixPaths = ($, locale, options) ->
  _.each {'script[src]': 'src', 'link[href]': 'href', 'img[src]': 'src', 'source[src]': 'src',}, (v, k) ->
    $(k).each ->
      src = $(this).attr(v)
      unless src[0] == '/' || absolutePathRegex.test(src)
        filepath = getPath src, locale, options
        $(this).attr(v, filepath)

translateConditionalComment = (node, locale, options, t) ->
  content = node.data
  match = conditionalCommentRegex.exec(content)
  return unless match
  result = exports.translate(match[2], locale, options, t)
  # NOTE: closing tag is added on parsing, so extra </html> or whatsoever
  # may be added. Find closing tags, and check if they are in the original input
  # Remove them from the output if they were not there before
  closingTags = result.match closingTagRegex
  _.each closingTags, (closingTag) ->
    return unless content.indexOf(closingTag) == -1
    result = result.replace closingTag, ''
  node.data = match[1] + result + match[3]

translateConditionalComments = ($, rootNode, locale, options, t) ->
  rootNode.contents().each (i, node) ->
    if node.type == 'comment'
      translateConditionalComment(node, locale, options, t)
    else
      translateConditionalComments($, $(node), locale, options, t)

exports.translate = (html, locale, options, t) ->
  $ = cheerio.load(html, {decodeEntities: false, xmlMode: options.xml})
  translateConditionalComments $, $.root(), locale, options, t if options.translateConditionalComments
  elems = $(options.selector)
  $(options.attrSelector).each ->
    translateAttributes $(this), options, t
  elems.each ->
    translateElem $, this, options, t
  if options.file && options.fixPaths
    fixPaths $, locale, options
  $.html()

exports.process = (rawHtml, options, callback) ->
  options = getOptions options
  i18n.init options.i18n, ->
    async.mapSeries options.locales, (locale, cb) ->
      i18n.setLng locale, (err, t) ->
        t = err unless t?
        loadResources locale, options, (err, resources) ->
          i18n.addResourceBundle locale, 'translation', resources unless err || _.isEmpty(resources)
          html = exports.translate rawHtml, locale, options, t
          cb err, html
    , (err, results) ->
      callback err, _.zipObject(options.locales, results)


outputFile = (file, options, results, callback) ->
  async.each _.keys(results), (locale, cb) ->
    result = results[locale]
    filepath = path.relative(options.baseDir, file)
    output = getOutput filepath, locale, options
    fs.outputFile output, result, cb
  , (err) ->
    callback err, results

exports.processFile = (file, options, callback) ->
  options = getOptions options
  options.file ?= file
  fs.readFile file, options.encoding, (err, html) ->
    return callback(err) if err
    exports.process html, options, (err, results) ->
      return callback(err) if err
      if options.outputDir
        outputFile file, options, results, callback
      else
        callback err, results

exports.processDir = (dir, options, callback) ->
  options.baseDir ?= dir
  glob path.join(dir, options.files ? defaults.files), (err, files) ->
    return callback(err) if err
    files = _.reject files, (f) ->
      f = path.relative options.baseDir, f
      _.some options.exclude, (i) ->
        if i.test then i.test(f) else f.indexOf(i) == 0
    async.mapSeries files, (file, cb) ->
      exports.processFile file, options, cb
    , (err, results) ->
      files = _.map files, (f) -> path.relative(dir, f)
      callback err, _.zipObject files, results
