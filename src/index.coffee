fs      = require 'fs'
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
  locale: 'en'
  files: '**/*.html'
  baseDir: process.cwd()
  removeAttr: true
  i18n:
    resGetPath: 'locales/__lng__.json'

getOptions = (baseOptions) ->
  options = _.merge {}, defaults, baseOptions
  unless baseOptions?.i18n?.resGetPath
    options.i18n.resGetPath = "#{options.localesPath}/__lng__.json"
  unless baseOptions?.i18n?.lng
    options.i18n.lng = options.locale
  options

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

exports.translate = (html, options, t) ->
  $ = cheerio.load(html)
  elems = $(options.selector)
  elems.each ->
    translateElem $, this, options, t
  $.html()

exports.process = (rawHtml, options, callback) ->
  options = getOptions options
  i18n.init options.i18n, ->
    async.map options.locales, (locale, cb) ->
      i18n.setLng locale, (t) ->
        html = exports.translate rawHtml, _.extend({}, options, {locale: locale}), t
        cb null, html
    , (err, results) ->
      callback err, _.zipObject(options.locales, results)

exports.processFile = (file, options, callback) ->
  fs.readFile file, 'utf8', (err, html) ->
    return callback(err) if err
    exports.process html, options, callback

exports.processDir = (dir, options, callback) ->
  glob path.join(dir, options.files ? defaults.files), (err, files) ->
    return callback(err) if err
    async.map files, (file, cb) ->
      exports.processFile file, options, cb
    , (err, results) ->
      files = _.map files, (f) -> path.relative(dir, f)
      callback err, _.zipObject files, results
