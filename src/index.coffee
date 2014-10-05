fs      = require 'fs'
cheerio = require 'cheerio'
_       = require 'lodash'
i18n    = require 'i18next'
async   = require 'async'

defaults =
  selector: '[data-t]'
  useAttr: true
  replace: false
  locales: ['en']
  locale: 'en'
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

exports.process = (html, options, callback) ->
  options = getOptions options

  i18n.init options.i18n, (t) ->
    $ = cheerio.load(html)
    elems = $(options.selector)
    elems.each ->
      translateElem $, this, options, t
    callback null, $.html()

exports.processAllLocales = (html, options, callback) ->
  async.map options.locales, (locale, cb) ->
    options = _.merge {}, options, {locale: locale}
    exports.process html, options, cb
  , (err, results) ->
    callback err, _.zipObject(options.locales, results)

exports.processFile = (file, options, callback) ->
  fs.readFile file, 'utf8', (err, html) ->
    return callback(err) if err
    exports.process html, options, callback
