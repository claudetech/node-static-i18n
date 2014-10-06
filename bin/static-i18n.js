#!/usr/bin/env node

var minimist   = require('minimist')
  , staticI18n = require('../lib');

var minimistOptions = {
  boolean: ['replace', 'useAttr', 'removeAttr', 'fixPaths']
, string: ['locale', 'selector', 'outputDir', 'outputDefault', 'outputOther', 'locales']
, alias: {
    l: 'locale'
  , i: 'locales'
  , s: 'selector'
  , d: 'baseDir'
  , o: 'outputDir'
  , 'output-dir': 'outputDir'
  , 'base-dir': 'baseDir'
  , f: 'fixPaths'
  , 'fix-paths': 'fixPaths'
  , 'locales-path': 'localesPath'
  , 'output-override': 'outputOverride'
  }
, default: {
    useAttr: true
  , fixPaths: true
  , replace: false
  , removeAttr: true
  }
};

var usage = function () {
  console.log("usage: static-i18n [options] directory");
};
var argv = require('minimist')(process.argv.slice(2), minimistOptions);
if (argv._.length !== 1) {
  usage();
  process.exit(1);
}

if (argv.outputOverride) {
  argv.outputOverride = JSON.parse(argv.outputOverride);
}

if (argv.i18n) {
  argv.i18n = JSON.parse(argv.i18n);
}

staticI18n.processDir(argv._[0], argv, function (err, results) {
  if (err) {
    console.log("An error has occured:");
    console.log(err);
    process.exit(1);
  }
});
