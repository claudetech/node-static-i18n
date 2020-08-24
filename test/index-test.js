const expect     = require('expect.js');
const path       = require('path');
const cheerio    = require('cheerio');
const _          = require('lodash');
const fs         = require('fs-extra');
const tmp        = require('tmp');
const staticI18n = require('../lib/index');

describe('processor', function() {
  const basepath = path.join(__dirname, 'data');

  const file = path.join(basepath, 'index.html');
  let options = {};

  beforeEach(function() {
    options = {
      localesPath: path.join(__dirname, 'data', 'locales'),
      outputDir: false
    };
  });

  describe('#process', function() {
    const input = '<p data-t="foo.bar"></p>';

    it('should process all locales', async function() {
      _.merge(options, {locales: ['en', 'ja']});
      const results = await staticI18n.process(input, options);
      expect(results).to.only.have.keys(['ja', 'en']);
      expect(results.ja).to.be('<p>ja_bar</p>');
      expect(results.en).to.be('<p>bar</p>');
    });

    it('should work with yaml', async function() {
      const input = '<p data-t="yaml.bar"></p>';
      _.merge(options, {fileFormat: 'yml'});
      const results = await staticI18n.process(input, options);
      expect(results).to.only.have.keys(['en']);
      expect(results.en).to.be('<p>bar</p>');
    });

    it('should translate attributes', async function() {
      const input = '<input class="foo" id="ok" data-attr-t value-t="foo.bar">';
      const results = await staticI18n.process(input, options);
      expect(results).to.only.have.keys(['en']);
      const $ = cheerio.load(results.en);
      expect($('input').attr('value')).to.be('bar');
      expect($('input').attr('id')).to.be('ok');
    });

    it('should translate attributes include "t"', async function() {
      const img = '<img src="example.png" class="foo" id="ok" data-attr-t alt-t="foo.bar" tool-tip-t="foo.bar">';
      const results = await staticI18n.process(img, options);
      const $ = cheerio.load(results.en);
      expect(results).to.only.have.keys(['en']);
      expect($('img').attr('alt')).to.be('bar');
      expect($('img').attr('tool-tip')).to.be('bar');
      expect($('img').attr('id')).to.be('ok');
    });

    it('should translate attributes with interpolation', async function() {
      options = _.merge({}, options, {locales: ['en', 'ja']});
      const input = '<input data-attr-t data-attr-t-interpolate href-t="{{links.baseAbsolute}}filename.{{links.extension}}">';
      const results = await staticI18n.process(input, options);
      let $ = cheerio.load(results.en);
      expect($('input').attr('href')).to.be('http://www.example.com/filename.html');
      expect($('input').attr('data-attr-t-interpolate')).to.be(undefined);
      $ = cheerio.load(results.ja);
      expect($('input').attr('href')).to.be('http://www.example.com/ja/filename.htm');
      expect($('input').attr('data-attr-t-interpolate')).to.be(undefined);
    });

    it('should remove interpolation related attributes', async function() {
      options = _.merge({}, options, {locales: ['en']});

      const input = '<p data-t data-t-interpolate>texto aqui<div>Whatever here</div></p>';
      const results = await staticI18n.process(input, options);
      const $ = cheerio.load(results.en);
      expect($('p').attr('data-t-interpolate')).to.be(undefined);
    });

    it('should not break SVG in XML mode', async function() {
      options = _.merge({}, options, {locales: ['en'], xml: true});
      const input = '<svg width="200" height="200"><path d="M10 10"/></svg>';
      const results = await staticI18n.process(input, options);
      expect(results.en).to.equal(input);
    });

    it('should handle namespace separator', async function() {
      options = _.merge({}, options, {nsSeparator: '#', locales: ['ja']});
      const input = '<p data-t="ns:boo.namespace:zoo"></p>';
      const results = await staticI18n.process(input, options);
      expect(results.ja).to.be('<p>ja_wow</p>');
    });
  });

  describe('#processFile', function() {
    it('should translate data-t', async function() {
      const results = await staticI18n.processFile(file, options);
      const $ = cheerio.load(results.en);
      expect($('#bar').text()).to.be('bar');
    });

    it('should translate data-t content', async function() {
      const results = await staticI18n.processFile(file, options);
      const $ = cheerio.load(results.en);
      expect($('#baz').text()).to.be('baz');
      expect($('#bar-replace > span').text()).to.be('bar');
    });

    it('should replace', async function() {
      options = _.defaults({replace: true}, options);
      const results = await staticI18n.processFile(file, options);
      const $ = cheerio.load(results.en);
      expect($('#bar').length).to.be(0);
      expect($('#baz').length).to.be(0);
      expect($('#bar-replace').html()).to.be('bar');
    });

    it('should work with other selectors', async function() {
      options = _.defaults({replace: true, selector: 't'}, options);
      const results = await staticI18n.processFile(file, options);
      const $ = cheerio.load(results.en);
      expect($('#bar-replace-sel').html()).to.be('bar');
    });

    it('should translate conditional comments', async function() {
      options = _.defaults({translateConditionalComments: true}, options);
      const results = await staticI18n.processFile(file, options);
      const $ = cheerio.load(results.en);
      const html = $.html();
      expect(html.indexOf('data-attr-t')).to.be(-1);
      _.each([6, 7, 8], (n) => {
        expect(html.indexOf(`class="ie ie${n}" lang="bar"`)).not.to.be(-1);
      });
      expect(html.indexOf('You are using')).not.to.be(-1);
    });
  });

  describe('#processDir', function() {
    it('should process all files', async function() {
      _.merge(options, {locales: ['en', 'ja'], exclude: ['ignored/']});
      const results = await staticI18n.processDir(basepath, options);
      expect(results).to.only.have.keys(['index.html', 'other.html', 'sub/index.html']);
      expect(results['index.html']).to.only.have.keys(['en', 'ja']);
      expect(results['other.html']).to.only.have.keys(['en', 'ja']);
      const $ = cheerio.load(results['index.html'].en);
      expect($('#bar').text()).to.be('bar');
    });

    it('should work with single locale', async function() {
      _.merge(options, {locales: 'en', exclude: ['ignored/']});
      const results = await staticI18n.processDir(basepath, options);
      expect(results['index.html']).to.only.have.keys(['en']);
    });
  });

  describe('withOutput', function() {
    let dir = null;
    let cleanup = null;

    beforeEach(function(done) {
      tmp.dir({unsafeCleanup: true}, function(err, path, cleanupCb) {
        dir = path;
        _.extend(options, {outputDir: dir, locales: ['en', 'ja']});
        cleanup = cleanupCb;
        done();
      });
    });

    afterEach(function() {
      cleanup();
    });

    it('should write all files', async function() {
      await staticI18n.processDir(basepath, options);
      let files = await fs.readdir(dir);
      _.each(['index.html', 'other.html', 'ja', 'sub'], (f) => expect(files).to.contain(f));
      files = await fs.readdir(path.join(dir, 'ja'));
      _.each(['index.html', 'other.html', 'sub'], (f) => expect(files).to.contain(f));
      let $ = cheerio.load(await fs.readFile(path.join(dir, 'index.html'), 'utf8'));
      expect($('#bar').text()).to.be('bar');
      $ = cheerio.load(await fs.readFile(path.join(dir, 'sub', 'index.html'), 'utf8'));
      expect($('#bar').text()).to.be('bar');
    });

    it('should handle overrides', async function() {
      _.extend(options, {outputOverride: {en: {'index.html': 'foo.html'}}});
      await staticI18n.processDir(basepath, options);
      const files = await fs.readdirSync(dir);
      _.each ['foo.html', 'other.html', 'ja'], (f) => expect(files).to.contain(f);
      expect(files).to.not.contain('index.html');
    });

    it('should fix paths', async function() {
      await staticI18n.processDir(basepath, options);
      let $ = cheerio.load(await fs.readFile(path.join(dir, 'ja', 'index.html'), 'utf8'));
      expect($('#rel-script').attr('src')).to.be('../foo.js');
      expect($('#abs-script').attr('src')).to.be('//foo.js');

      expect($('#rel-link').attr('href')).to.be('../foo.css');
      expect($('#abs-link').attr('href')).to.be('//foo.css');

      expect($('#rel-img').attr('src')).to.be('../foo.png');
      expect($('#abs-img').attr('src')).to.be('//foo.png');

      expect($('#rel-audio').attr('src')).to.be('../foo.mp3');
      expect($('#abs-audio').attr('src')).to.be('//foo.mp3');

      expect($('#rel-video').attr('src')).to.be('../foo.mp4');
      expect($('#abs-video').attr('src')).to.be('//foo.mp4');

      expect($('#rel-source').attr('src')).to.be('../foo.jpg');
      expect($('#abs-source').attr('src')).to.be('//foo.jpg');

      expect($('#rel-style').attr('style')).to.be("background-image: url('../bg.jpg'); background: url('../bg.jpg')");
      expect($('#abs-style').attr('style')).to.be("background-image: url(//bg.jpg); background: url('//bg.jpg')");

      $ = cheerio.load(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'));
      expect($('#rel-script').attr('src')).to.be('foo.js');
      expect($('#rel-link').attr('href')).to.be('foo.css');
      expect($('#rel-img').attr('src')).to.be('foo.png');
      expect($('#rel-audio').attr('src')).to.be('foo.mp3');
      expect($('#rel-video').attr('src')).to.be('foo.mp4');
      expect($('#rel-source').attr('src')).to.be('foo.jpg');
      expect($('#rel-style').attr('style')).to.be("background-image: url(bg.jpg); background: url('bg.jpg'");
    });
  });
});
