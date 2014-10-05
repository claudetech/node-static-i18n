expect    = require 'expect.js'
path      = require 'path'
cheerio   = require 'cheerio'
_         = require 'lodash'

staticI18n      = require '../src/index'

describe 'processor', ->
  basepath = path.join __dirname, 'data'

  file = path.join basepath, 'index.html'
  options = {localesPath: path.join(__dirname, 'data', 'locales')}

  describe '#translate', ->
    it 'should translate data-t', (done) ->
      staticI18n.processFile file, options, (err, html, $) ->
        expect($('#bar').text()).to.be 'bar'
        done()

    it 'should translate data-t content', (done) ->
      staticI18n.processFile file, options, (err, html, $) ->
        expect($('#baz').text()).to.be 'baz'
        expect($('#bar-replace > span').text()).to.be 'bar'
        done()

    it 'should replace', (done) ->
      options = _.defaults {replace: true}, options
      staticI18n.processFile file, options, (err, html, $) ->
        expect($('#bar').length).to.be 0
        expect($('#baz').length).to.be 0
        expect($('#bar-replace').html()).to.be 'bar'
        done()

    it 'should work with other selectors', (done) ->
      options = _.defaults {replace: true, selector: 't'}, options
      staticI18n.processFile file, options, (err, html, $) ->
        expect($('#bar-replace-sel').html()).to.be 'bar'
        done()
