#!/usr/bin/env node

/* eslint no-console: 0 */

const minimist   = require('minimist');
const staticI18n = require('../lib');

const minimistOptions = {
  boolean: [
    'replace',
    'useAttr',
    'removeAttr',
    'fixPaths',
    'translateConditionalComments',
    'xml',
    'allowHtml',
    'version',
    'help',
    'localeRootKey',
  ],
  string: [
    'locale',
    'selector',
    'outputDir',
    'outputDefault',
    'outputOther',
    'locales',
  ],
  alias: {
    l: 'locale',
    i: 'locales',
    s: 'selector',
    d: 'baseDir',
    o: 'outputDir',
    v: 'version',
    h: 'help',
    r: 'localeRootKey',
    'root-key': 'rootKey',
    'base-dir': 'baseDir',
    'output-dir': 'outputDir',
    'output-default': 'outputDefault',
    'output-other': 'outputOther',
    'output-override': 'outputOverride',
    'translate-conditional-comments': 'translateConditionalComments',
    f: 'fixPaths',
    t: 'fileFormat',
    'file-format': 'fileFormat',
    'fix-paths': 'fixPaths',
    'locales-path': 'localesPath',
    'allow-html': 'allowHtml',
  },
  default: {
    localeRootKey: false,
    useAttr: true,
    fixPaths: true,
    replace: false,
    removeAttr: true,
    xml: false,
  },
};

const usageText = [
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
  '-r, --root-key\t\tuse locale as source file root key',
  '',
  'Please check the README for more information:',
  'https://github.com/claudetech/node-static-i18n'
].join('\n');

function usage() {
  console.log(usageText);
}

function version() {
  console.log(require('../package.json').version);
}

const argv = minimist(process.argv.slice(2), minimistOptions);

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

staticI18n.processDir(argv._[0], argv).catch((err) => {
  console.log("An error has occured:");
  console.log(err.toString());
  process.exit(1);
});
