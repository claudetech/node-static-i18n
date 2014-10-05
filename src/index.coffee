fs      = require 'fs'
cheerio = require 'cheerio'
_       = require 'lodash'
i18n    = require 'i18next'

defaults =
  selector: '[data-t]'
  useAttr: true
  replace: false
  locales: ['en']
  i18n:
    resGetPath: 'locales/__lng__.json'
    lng: 'en'

getOptions = (baseOptions) ->
  options = _.merge {}, defaults, baseOptions
  if baseOptions?.localesPath && !baseOptions?.i18n?.resGetPath
    options.i18n.resGetPath = "#{options.localesPath}/__lng__.json"
  options

translateElem = ($, elem, options, t) ->
  $elem = $(elem)
  if options.useAttr && attr = /^\[(.*?)\]$/.exec(options.selector)
    key = $elem.attr(attr[1])
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
    callback null, html, $

exports.processFile = (file, options, callback) ->
  fs.readFile file, 'utf8', (err, html) ->
    return callback(err) if err
    exports.process html, options, callback
