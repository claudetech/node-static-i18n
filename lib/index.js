'use strict';

const fs       = require('fs-extra');
const cheerio  = require('cheerio');
const _        = require('lodash');
const i18n     = require('i18next');
const path     = require('path');
const glob     = require('glob');
const yaml     = require('js-yaml');
const Promise  = require('bluebird');

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
  outputDir: null,
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
  localeRootKey: false,
  nsSeparator: ":",
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

function promisify(func, ignoreError) {
  return function() {
    const args = Array.prototype.slice.call(arguments);
    return new Promise((resolve, reject) => {
      args.push(function(err, result) {
        err && !ignoreError ? reject(err) : resolve(result);
      });
      func.apply(func, args);
    });
  };
}

function parseTranslations(format, rawTranslations, localeRootKey, locale) {
  try {
    switch (format) {
      case '.yml':
      case '.yaml':
        return localeRootKey ? yaml.load(rawTranslations)[locale] : yaml.load(rawTranslations);
      case '.json':
        return localeRootKey ? JSON.parse(rawTranslations)[locale] : JSON.parse(rawTranslations);
      default:
        throw new Error('unknown format');
    }
  } catch (e) {
    e.message = ['[', locale, '] ', e.message].join('');
    throw e;
  }
}

function loadResources(locale, options) {
  const file = path.join(options.localesPath, options.localeFile).replace('__lng__', locale);
  const extension = path.extname(file);
  return fs.readFile(file, options.encoding)
           .then(data => parseTranslations(extension, data, options.localeRootKey, locale));
}

function getOptions(baseOptions) {
  const shouldUpdateLocalesPath = !baseOptions.localesPath;
  const options = _.merge({}, defaults, baseOptions);
  if (shouldUpdateLocalesPath) {
    options.localesPath = path.join(options.baseDir, options.localesPath);
  }
  options.locales = _.castArray(options.locales);
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

function getRawOutputFile(file, locale, options) {
  const outputOverride = options.outputOverride || {};
  if (outputOverride[locale] && outputOverride[locale][file]) {
    return options.outputOverride[locale][file];
  } else if (locale === options.locale) {
    return  options.outputDefault;
  } else {
    return options.outputOther;
  }
}

function getOutput(file, locale, options, absolute) {
  const output = getRawOutputFile(file, locale, options);
  const outputFile = output
    .replace('__lng__', locale)
    .replace('__file__', file)
    .replace('__basename__', path.basename(file, path.extname(file)));
  if (absolute !== false) {
    const outdir = _.isString(options.outputDir) ? options.outputDir : options.baseDir;
    return path.join(outdir, outputFile);
  } else {
    return outputFile;
  }
}

function getAttrFromSelector(selector) {
  const match = /^\[(.*?)\]$/.exec(selector);
  if (match) {
    return match[1];
  }
}

function translateAttributes($elem, options, t) {
  const selectorAttr = getAttrFromSelector(options.attrSelector);
  const selectorInterpolateAttr = getAttrFromSelector(options.attrInterpolateSelector);
  const interpolate = _.some($elem.attr(), function(v, k) {
    return _.endsWith(k, options.attrInterpolateSuffix);
  });
  _.each($elem.attr(), function(v, k) {
    if (_.isEmpty(v) || k === selectorAttr) {
      return;
    }
    if (_.endsWith(k, options.attrSuffix)) {
      const isData = options.useAttr && k === getAttrFromSelector(options.selector);
      const attr = isData ? k : k.substring(0, k.length - options.attrSuffix.length);
      let trans = t(v);
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
  let key, attr;
  const $elem = $(elem);
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
  let trans = t(key);
  const interpolateAttr = getAttrFromSelector(options.interpolateSelector);
  const interpolate = $elem.filter(options.interpolateSelector).length;
  if (interpolate) {
    trans = trans.replace(/{{([^{}]*)}}/g, function(aa, bb) {
      return t(bb);
    });
  }
  if (options.replace) {
    return $elem.replaceWith(trans);
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

function getPath(fpath, locale, options) {
  const filepath = path.relative(options.baseDir, options.file);
  const output = getOutput(filepath, locale, options, false);
  const diff = path.relative(path.dirname(output), '');
  if (_.isEmpty(diff)) {
    return fpath;
  } else {
    return "" + diff + "/" + fpath;
  }
}

function fixHTMLPaths($, locale, options) {
  return _.each({
    'audio[src]': 'src',
    'img[src]': 'src',
    'link[href]': 'href',
    'script[src]': 'src',
    'source[src]': 'src',
    'video[src]': 'src'
  }, function(v, k) {
    return $(k).each(function() {
      const src = $(this).attr(v);
      if (!(src[0] === '/' || absolutePathRegex.test(src))) {
        const filepath = getPath(src, locale, options);
        return $(this).attr(v, filepath);
      }
    });
  });
}

function fixCSSPaths($, locale, options) {
  return _.each({
    '*[style]': 'style'
  }, function(v, k) {
    return $(k).each(function() {
      const style = $(this).attr(v);
      const urlRegEx = /url\( *[\'\"\`]?(.+?)[\'\"\`]? *\)/gmi;

      if(style.match(urlRegEx)) {
        const finalString = style.replace(urlRegEx, function (curr, src) {
          if (!(src[0] === '/' || absolutePathRegex.test(src))) {
            return "url('"+ getPath(src, locale, options) + "')";
          } else {
            return curr;
          }
        });
        return $(this).attr(v, finalString);
      }
    });
  });
}


function translateConditionalComment(node, locale, options, t) {
  const content = node.data;
  const match = conditionalCommentRegex.exec(content);
  if (!match) {
    return;
  }
  let result = exports.translate(match[2], locale, options, t);
  const closingTags = result.match(closingTagRegex);
  _.each(closingTags, function(closingTag) {
    if (content.indexOf(closingTag) !== -1) {
      return;
    }
    result = result.replace(closingTag, '');
  });
  node.data = match[1] + result + match[3];
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
    fixHTMLPaths($, locale, options);
    fixCSSPaths($, locale, options);
  }
  return $.html();
};

function processLocale(rawHtml, locale, options) {
  return Promise.all([
    promisify(i18n.changeLanguage.bind(i18n), true)(locale),
    loadResources(locale, options)
  ]).then((results) => {
    const t = results[0];
    const resources = results[1];
    if (!_.isEmpty(resources)) {
      i18n.addResourceBundle(locale, 'translation', resources);
    }
    return exports.translate(rawHtml, locale, options, t);
  });
}

exports.process = function(rawHtml, options) {
  options = getOptions(options);
  i18n.init(_.assign({initImmediate: true}, options));
  return Promise.mapSeries(options.locales, (locale) => {
    return processLocale(rawHtml, locale, options);
  }).then((results) => _.zipObject(options.locales, results));
};

const outputFile = function(file, options, results) {
  return Promise.each(_.keys(results), function(locale) {
    const result = results[locale];
    const filepath = path.relative(options.baseDir, file);
    const output = getOutput(filepath, locale, options);
    return fs.outputFile(output, result);
  });
};

exports.processFile = function(file, options) {
  options = getOptions(options);
  options.file = options.file || file;
  return fs.readFile(file, options.encoding)
    .then((html) => exports.process(html, options))
    .then((results) => {
      if (options.outputDir) {
        return outputFile(file, options, results);
      } else {
        return results;
      }
    });
};

function shouldExcludeFile(file, options) {
  file = path.relative(options.baseDir, file);
  return _.some(_.castArray(options.exclude || []), function (excludePattern) {
    if (excludePattern.test) {
      return excludePattern.test(file);
    } else {
      return file.indexOf(excludePattern) === 0;
    }
  });
}

exports.processDir = function(dir, options) {
  if (!options.baseDir) {
    options.baseDir = dir;
  }
  const pattern = options.files || defaults.files;
  return promisify(glob)(path.join(dir, pattern))
    .then((files) => _.reject(files, (f) => shouldExcludeFile(f, options)))
    .mapSeries((file) =>
      exports.processFile(file, options).then((r) => [file, r])
    )
    .then((results) => {
      return _(results)
        .fromPairs()
        .mapKeys((_v, f) => path.relative(dir, f))
        .value();
    });
};

