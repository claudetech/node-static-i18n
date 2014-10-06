fs      = require 'fs-extra'
cheerio = require 'cheerio'
_       = require 'lodash'
i18n    = require 'i18next'
async   = require 'async'
path    = require 'path'
glob    = require 'glob'

defaults =
  selector: '[data-t]'
  useAttr: true
  replace: false
  locales: ['en']
  fixPaths: true
  locale: 'en'
  files: '**/*.html'
  baseDir: process.cwd()
  removeAttr: true
  outputDir: undefined
  outputDefault: '__file__'
  outputOther: '__lng__/__file__'
  localesPath: 'locales'
  outputOverride: {}
  i18n:
    resGetPath: 'locales/__lng__.json'

absolutePathRegex = new RegExp('^(?:[a-z]+:)?//', 'i')

getOptions = (baseOptions) ->
  options = _.merge {}, defaults, baseOptions
  unless baseOptions?.i18n?.resGetPath
    options.i18n.resGetPath = "#{options.localesPath}/__lng__.json"
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

translateElem = ($, elem, options, t) ->
  $elem = $(elem)
  if options.useAttr && attr = /^\[(.*?)\]$/.exec(options.selector)
    key = $elem.attr(attr[1])
    $elem.attr(attr[1], null) if options.removeAttr
  key = $elem.text() if _.isEmpty(key)
  trans = t(key)
  if options.replace
    $elem.replaceWith trans
  else
    $elem.text(trans)

getPath = (fpath, locale, options) ->
  filepath = path.relative(options.baseDir, options.file)
  output = getOutput filepath, locale, options, false
  diff = path.relative(path.dirname(output), '')
  if _.isEmpty(diff) then fpath else "#{diff}/#{fpath}"

fixPaths = ($, locale, options) ->
  _.each {src: 'script[src]', href: 'link[href]'}, (v, k) ->
    $(v).each (script) ->
      src = $(this).attr(k)
      unless src[0] == '/' || absolutePathRegex.test(src)
        filepath = getPath src, locale, options
        $(this).attr(k, filepath)

exports.translate = (html, locale, options, t) ->
  $ = cheerio.load(html)
  elems = $(options.selector)
  elems.each ->
    translateElem $, this, options, t
  if options.file && options.fixPaths
    fixPaths $, locale, options
  $.html()

exports.process = (rawHtml, options, callback) ->
  options = getOptions options
  i18n.init options.i18n, ->
    async.mapSeries options.locales, (locale, cb) ->
      i18n.setLng locale, (t) ->
        html = exports.translate rawHtml, locale, options, t
        cb null, html
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
  fs.readFile file, 'utf8', (err, html) ->
    return callback(err) if err
    exports.process html, options, (err, results) ->
      if options.outputDir
        outputFile file, options, results, callback
      else
        callback err, results

exports.processDir = (dir, options, callback) ->
  options.baseDir ?= dir
  glob path.join(dir, options.files ? defaults.files), (err, files) ->
    return callback(err) if err
    async.map files, (file, cb) ->
      exports.processFile file, options, cb
    , (err, results) ->
      files = _.map files, (f) -> path.relative(dir, f)
      callback err, _.zipObject files, results
