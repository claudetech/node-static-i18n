#!/usr/bin/env node

var minimist   = require('minimist')
  , staticI18n = require('../lib');

var minimistOptions = {
  boolean: ['replace', 'useAttr', 'removeAttr', 'fixPaths', 'translateConditionalComments', 'xml', 'version', 'help']
, string: ['locale', 'selector', 'outputDir', 'outputDefault', 'outputOther', 'locales']
, alias: {
    l: 'locale'
  , i: 'locales'
  , s: 'selector'
  , d: 'baseDir'
  , o: 'outputDir'
  , v: 'version'
  , h: 'help'
  , 'output-dir': 'outputDir'
  , 'base-dir': 'baseDir'
  ,  'translate-conditional-comments': 'translateConditionalComments'
  , f: 'fixPaths'
  , t: 'fileFormat'
  , 'file-format': 'fileFormat'
  , 'fix-paths': 'fixPaths'
  , 'locales-path': 'localesPath'
  , 'output-override': 'outputOverride'
  }
, default: {
    useAttr: true
  , fixPaths: true
  , replace: false
  , removeAttr: true
  , xml: false
  }
};

var usageText = [
  'usage: static-i18n [options] directory',
  '',
  'positional arguments:',
  'directory\t\tpath to the directory to translate',
  '',
  'optional arguments:',
  '-l, --locale\t\tdefault locale',
  '-i, --locales\t\tlocales to use (can be passed multiple times)',
  '-o, --output-dir\toutput directory (default: i18n)',
  '-v, --version\t\tprints version and exits',
  '-h, --help\t\tprints this help and exits',
  '',
  'Please check the README for more information:',
  'https://github.com/claudetech/node-static-i18n'
].join('\n');

var usage = function () {
  console.log(usageText);
};

var version = function () {
  console.log(require('../package.json').version);
};

var argv = require('minimist')(process.argv.slice(2), minimistOptions);

if (argv.version) {
  version();
  process.exit(0);
}

if (argv.help) {
  usage();
  process.exit(0);
}

if (argv._.length !== 1) {
  console.log('missing positional argument: directory');
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
    console.log(err.toString());
    process.exit(1);
  }
});
