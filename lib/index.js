const fs      = require('fs-extra');
const cheerio = require('cheerio');
const _       = require('lodash');
const i18n    = require('i18next');
const async   = require('async');
const path    = require('path');
const glob    = require('glob');
const yaml    = require('js-yaml');
const S       = require('string');


const defaults = {
  selector: '[data-t]',
  attrSelector: '[data-attr-t]',
  interpolateSelector: '[data-t-interpolate]',
  attrInterpolateSelector: '[data-attr-t-interpolate]',
  xml: false,
  useAttr: true,
  replace: false,
  locales: ['en'],
  fixPaths: true,
  locale: 'en',
  files: '**/*.html',
  baseDir: process.cwd(),
  removeAttr: true,
  outputDir: void 0,
  attrSuffix: '-t',
  attrInterpolateSuffix: '-t-interpolate',
  allowHtml: false,
  exclude: [],
  fileFormat: 'json',
  localeFile: '__lng__.__fmt__',
  outputDefault: '__file__',
  outputOther: '__lng__/__file__',
  localesPath: 'locales',
  outputOverride: {},
  encoding: 'utf8',
  translateConditionalComments: false,
  i18n: {
    resGetPath: 'locales/__lng__.json',
    setJqueryExt: false
  }
};

const absolutePathRegex = new RegExp('^(?:[a-z]+:)?//', 'i');
const conditionalCommentRegex = /(\s*\[if .*?\]\s*>\s*)(.*?)(\s*<!\s*\[endif\]\s*)/i;
const closingTagRegex = /<\/.+?>/g;

function parseTranslations(format, rawTranslations, callback) {
  switch (format) {
    case '.yml':
    case '.yaml':
      try {
        return callback(null, yaml.load(rawTranslations));
      } catch (err) {
        return callback(err);
      }
      break;
    case '.json':
      try {
        return callback(null, JSON.parse(rawTranslations));
      } catch (err) {
        return callback(err);
      }
      break;
    default:
      return callback({
        message: 'unknown format'
      });
  }
}

function loadResources(locale, options, callback) {
  const file = path.join(options.localesPath, options.localeFile).replace('__lng__', locale);
  const extension = path.extname(file);
  return fs.readFile(file, options.encoding, function(err, data) {
    if (err) {
      return callback(err);
    }
    return parseTranslations(extension, data, callback);
  });
}

function getOptions(baseOptions) {
  baseOptions = baseOptions || {};
  const options = _.merge({}, defaults, baseOptions);
  options.localeFile = options.localeFile.replace('__fmt__', options.fileFormat);
  if (!_.has(baseOptions, 'i18n.resGetPath')) {
    if (path.extname(options.localeFile) === '.json') {
      options.i18n.resGetPath = path.join(options.localesPath, options.localeFile);
    } else {
      options.i18n.resGetPath = path.join(options.localesPath, '__lng__.json');
    }
  }
  if (!_.has(baseOptions, 'i18n.lng')) {
    options.i18n.lng = options.locale;
  }
  if (_.isUndefined(baseOptions.outputDir)) {
    options.outputDir = path.join(process.cwd(), 'i18n');
  }
  return options;
}

function getOutput(file, locale, options, absolute) {
  var outdir, output, outputFile, _ref, _ref1;
  if (absolute == null) {
    absolute = true;
  }
  if ((_ref = options.outputOverride) != null ? (_ref1 = _ref[locale]) != null ? _ref1[file] : void 0 : void 0) {
    output = options.outputOverride[locale][file];
  } else if (locale === options.locale) {
    output = options.outputDefault;
  } else {
    output = options.outputOther;
  }
  outputFile = output.replace('__lng__', locale).replace('__file__', file);
  if (absolute) {
    outdir = _.isString(options.outputDir) ? options.outputDir : options.baseDir;
    return path.join(outdir, outputFile);
  } else {
    return outputFile;
  }
}

function translateAttributes($elem, options, t) {
  var _ref, _ref1;
  const selectorAttr = (_ref = /^\[(.*?)\]$/.exec(options.attrSelector)) != null ? _ref[1] : void 0;
  const selectorInterpolateAttr = (_ref1 = /^\[(.*?)\]$/.exec(options.attrInterpolateSelector)) != null ? _ref1[1] : void 0;
  let interpolate = false;
  _.each($elem.attr(), function(v, k) {
    if (S(k).endsWith(options.attrInterpolateSuffix)) {
      return interpolate = true;
    }
  });
  _.each($elem.attr(), function(v, k) {
    var attr, isData, trans, _ref2;
    if (_.isEmpty(v) || k === selectorAttr) {
      return;
    }
    if (S(k).endsWith(options.attrSuffix)) {
      isData = options.useAttr && k === ((_ref2 = /^\[(.*?)\]$/.exec(options.selector)) != null ? _ref2[1] : void 0);
      attr = isData ? k : S(k).chompRight(options.attrSuffix).s;
      trans = t(v);
      if (interpolate) {
        trans = v.replace(/{{([^{}]*)}}/g, function(aa, bb) {
          return t(bb);
        });
      }
      $elem.attr(attr, trans);
      if (options.removeAttr && !isData) {
        return $elem.attr(k, null);
      }
    }
  });
  if ((selectorAttr != null) && options.removeAttr) {
    $elem.attr(selectorAttr, null);
  }
  if (selectorInterpolateAttr != null) {
    return $elem.attr(selectorInterpolateAttr, null);
  }
}

function translateElem($, elem, options, t) {
  var $elem, attr, interpolate, interpolateAttr, key, trans, _ref;
  $elem = $(elem);
  if (options.useAttr && (attr = /^\[(.*?)\]$/.exec(options.selector))) {
    key = $elem.attr(attr[1]);
    if (options.removeAttr) {
      $elem.attr(attr[1], null);
    }
  }
  if (_.isEmpty(key)) {
    key = $elem.text();
  }
  if (_.isEmpty(key)) {
    return;
  }
  trans = t(key);
  if (options.replace) {
    return $elem.replaceWith(trans);
  } else {
    interpolateAttr = (_ref = /^\[(.*?)\]$/.exec(options.interpolateSelector)) != null ? _ref[1] : void 0;
    interpolate = $elem.filter(options.interpolateSelector).length;
    if (interpolate) {
      trans = trans.replace(/{{([^{}]*)}}/g, function(aa, bb) {
        return t(bb);
      });
    }
    if (options.allowHtml) {
      if (interpolate) {
        $elem.html($elem.html().replace(/{{([^{}]*)}}/g, function(aa, bb) {
          return t(bb);
        }));
      } else {
        $elem.html(trans);
      }
    } else {
      $elem.text(trans);
    }
    if (options.removeAttr && interpolate) {
      return $elem.attr(interpolateAttr, null);
    }
  }
}

function getPath(fpath, locale, options) {
  var diff, filepath, output;
  filepath = path.relative(options.baseDir, options.file);
  output = getOutput(filepath, locale, options, false);
  diff = path.relative(path.dirname(output), '');
  if (_.isEmpty(diff)) {
    return fpath;
  } else {
    return "" + diff + "/" + fpath;
  }
}

function fixPaths($, locale, options) {
  return _.each({
    'script[src]': 'src',
    'link[href]': 'href',
    'img[src]': 'src',
    'source[src]': 'src'
  }, function(v, k) {
    return $(k).each(function() {
      var filepath, src;
      src = $(this).attr(v);
      if (!(src[0] === '/' || absolutePathRegex.test(src))) {
        filepath = getPath(src, locale, options);
        return $(this).attr(v, filepath);
      }
    });
  });
}

function translateConditionalComment(node, locale, options, t) {
  var closingTags, content, match, result;
  content = node.data;
  match = conditionalCommentRegex.exec(content);
  if (!match) {
    return;
  }
  result = exports.translate(match[2], locale, options, t);
  closingTags = result.match(closingTagRegex);
  _.each(closingTags, function(closingTag) {
    if (content.indexOf(closingTag) !== -1) {
      return;
    }
    return result = result.replace(closingTag, '');
  });
  return node.data = match[1] + result + match[3];
}

function translateConditionalComments($, rootNode, locale, options, t) {
  return rootNode.contents().each(function(i, node) {
    if (node.type === 'comment') {
      return translateConditionalComment(node, locale, options, t);
    } else {
      return translateConditionalComments($, $(node), locale, options, t);
    }
  });
}

exports.translate = function(html, locale, options, t) {
  const $ = cheerio.load(html, {
    decodeEntities: false,
    xmlMode: options.xml
  });
  if (options.translateConditionalComments) {
    translateConditionalComments($, $.root(), locale, options, t);
  }
  const elems = $(options.selector);
  $(options.attrSelector).each(function() {
    return translateAttributes($(this), options, t);
  });
  elems.each(function() {
    return translateElem($, this, options, t);
  });
  if (options.file && options.fixPaths) {
    fixPaths($, locale, options);
  }
  return $.html();
};

exports.process = function(rawHtml, options, callback) {
  options = getOptions(options);
  return i18n.init(options.i18n, function() {
    return async.mapSeries(options.locales, function(locale, cb) {
      return i18n.setLng(locale, function(err, t) {
        if (t == null) {
          t = err;
        }
        return loadResources(locale, options, function(err, resources) {
          if (!(err || _.isEmpty(resources))) {
            i18n.addResourceBundle(locale, 'translation', resources);
          }
          const html = exports.translate(rawHtml, locale, options, t);
          return cb(err, html);
        });
      });
    }, function(err, results) {
      return callback(err, _.zipObject(options.locales, results));
    });
  });
};

const outputFile = function(file, options, results, callback) {
  return async.each(_.keys(results), function(locale, cb) {
    const result = results[locale];
    const filepath = path.relative(options.baseDir, file);
    const output = getOutput(filepath, locale, options);
    return fs.outputFile(output, result, cb);
  }, function(err) {
    return callback(err, results);
  });
};

exports.processFile = function(file, options, callback) {
  options = getOptions(options);
  if (options.file == null) {
    options.file = file;
  }
  return fs.readFile(file, options.encoding, function(err, html) {
    if (err) {
      return callback(err);
    }
    return exports.process(html, options, function(err, results) {
      if (err) {
        return callback(err);
      }
      if (options.outputDir) {
        return outputFile(file, options, results, callback);
      } else {
        return callback(err, results);
      }
    });
  });
};

exports.processDir = function(dir, options, callback) {
  if (options.baseDir == null) {
    options.baseDir = dir;
  }
  const files = options.files || defaults.files;
  return glob(path.join(dir, files), function(err, files) {
    if (err) {
      return callback(err);
    }
    files = _.reject(files, function(f) {
      f = path.relative(options.baseDir, f);
      return _.some(options.exclude, function(i) {
        if (i.test) {
          return i.test(f);
        } else {
          return f.indexOf(i) === 0;
        }
      });
    });
    return async.mapSeries(files, function(file, cb) {
      return exports.processFile(file, options, cb);
    }, function(err, results) {
      files = _.map(files, function(f) {
        return path.relative(dir, f);
      });
      return callback(err, _.zipObject(files, results));
    });
  });
};
