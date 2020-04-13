# node-static-i18n [![Build Status](https://travis-ci.org/claudetech/node-static-i18n.svg?branch=master)](https://travis-ci.org/claudetech/node-static-i18n)

A simple utility to translate static HTML files.

Supports JSON and YAML dictionaries.

## Installation

For global installation, needed for CLI uage, run

```sh
$ npm install -g static-i18n
```

Note that you can also use this as a [Grunt plugin](https://github.com/claudetech/grunt-i18n-static) or a [gulp plugin](https://github.com/36web/gulp-static-i18n-html).

## Example

A simple example should be easy to understand.

With the following files:

`www/index.html`:

```html
<html>
  <head>
    <script src="js/app.js"></script>
  </head>
  <body>
    <h1 data-t="my.key"></h1>
    <p data-t>other.key</p>
    <input type="submit" data-attr-t value-t="other.ok">
  </body>
</html>
```

`locales/en.json`

```json
{
  "my": {
    "key": "Hey"
  },
  "other": {
    "key": "man",
    "ok": "confirm"
  }
}
```

`locales/fr.json`

```json
{
  "my": {
    "key": "Salut"
  },
  "other": {
    "key": "mec",
    "ok": "confirmer"
  }
}
```

The following command

```sh
$ static-i18n -l en -i en -i fr www
```

will generate:

`i18n/index.html`

```html
<html>
  <head>
    <script src="js/app.js"></script>
  </head>
  <body>
    <h1>Hey</h1>
    <p>man</p>
    <input type="submit" value="confirm">
  </body>
</html>
```

`i18n/fr/index.html`

```html
<html>
  <head>
    <script src="../js/app.js"></script>
  </head>
  <body>
    <h1>Salut</h1>
    <p>mec</p>
    <input type="submit" value="confirmer">
  </body>
</html>
```

## Interpolation
You can optionally specify that interpolation should be applied to the custom attributes on an element.
This will translate only the parts of an element wrapped in curly braces {{ }} and leave the rest alone.

With the following files:

`www/index.html`:

```html
<html>
  <head>
    <link rel="canonical" data-attr-t data-attr-t-interpolate href-t="{{links.baseAbsolute}}filename.{{links.extension}}" />
  </head>
</html>
```

`locales/en.json`

```json
{
  "links": {
    "baseAbsolute": "http://www.example.com/",
    "extension": "html"
  }
}
```

`locales/ja.json`

```json
{
  "links": {
    "baseAbsolute": "http://www.example.com/ja/",
    "extension": "htm"
  }
}
```

The following command

```sh
$ static-i18n --locale en --locales en --locales ja www
```

Will generate:

`i18n/index.html`

```html
<html>
  <head>
    <link rel="canonical" href="http://www.example.com/filename.html" />
  </head>
</html>
```

`i18n/ja/index.html`

```html
<html>
  <head>
    <link rel="canonical" href="http://www.example.com/ja/filename.htm" />
  </head>
</html>
```

## Configuration

This tool has several configuration options to adapt to most common use cases.

When using the CLI, these options can be passed by using the kebab-case version of the key. For example. `attrSelector` can be passed with

```
static-i18n --attr-selector my-attr-t ...
```

* `selector` (default: `[data-t]`): The selector to look for elements to translate. If it is an attribute, the attribute content is used as the key when non empty, otherwise the text of the element is used.
* `attrSelector` (default: `[data-attr-t]`): The selector to look for elements
* `attrInterpolateSelector` (default: `[data-attr-t-interpolate]`): The selector that should be applied to elements to indicate that interpolation should be performed for the custom attributes on that element
* `xml` (default: `false`): If `true`, enables XML mode for https://github.com/fb55/htmlparser2 which avoids breaking self-closing tags
* `attrSuffix` (default: `-t`): Suffix for attr to translate. `value-t` will be translated and mapped to `value`.
* `attrInterpolateSuffix` (default: `-t-interpolate`): Suffix for attr to interpolate the translations.
* `useAttr` (default: `true`): If `false`, the element text is always used as the key, even if the attribute value is not empty.
* `nsSeparator` (default: `:`): The namespace separator. Useful if keys contain colons. Change it to something else to prevent cutting off the namespace.
* `replace` (default: `false`): If `true`, the element is replaced by the translation. Useful to use something like `<t>my.key</t>` to translate.
* `locales` (default: `['en']`, CLI alias: `-i`): the list of locales to be generated.
  All locales need to have an existing resource file.
* `fixPaths` (default: `true`): When `true`, the `script[src]` and `link[href]`  relative paths are fixed to fit the new subdirectory structure. (See example above.)
* `locale` (default: `en`, CLI alias: `-l`): The default locale.
* `exclude` (default: `[]`): Files to exclude. Can contain regex (uses normal test) or string (uses startsWith).
* `fileFormat` (default: `json`): The file format for the translations.
  Supports `json`, and `yml` or `yaml` which will be treated as YAML files. The file extension must match this format.
* `encoding` (default: `utf8`): The encoding to read files (only works with yaml for now)
* `files` (default: `**/*.html`): The files to translate, relative to the base directory.
* `baseDir` (default: `process.cwd()`, CLI alias: `-d`): The base directory to look for translations. Not useful for CLI usage as it is overriden by the directory argument.
* `translateConditionalComments` (default: `false`): Translate the content of conditional comments (see #1). This is still experimental, and could fail on edge cases. Open an issue if needed.
* `allowHtml` (default: `false`): Allow the usage of HTML in translation
* `removeAttr` (default: `true`): When `true`, removes the attribute used to translate (e.g. `data-t` will be removed)
* `outputDir` (default: `i18n`, CLI alias: `-o`): The directory to output generated files
* `outputDefault` (default: `__file__`): The name for the default locale output files, relative to `outputDir`. `__file__` will be replaced by the
 current file name
* `outputOther` (default: `__lng__/__file__`): The name for the other locales output files, relative to `outputDir`. `__lng__` will be replaced
  by the current locale
* `localesPath` (default: `locales`): The directory of the translations, where
  each file should be named `LOCALE_NAME.json`
* `outputOverride`: Override outputDefault or outputOther for special cases (default: {})
  eg:

    ```javascript
    {
      "en": {
        "index.html": "foo.html"
      },
      "ja": {
        "index.html": "ja_index.html"
      }
    }
    ```
* `i18n`: Object passed directly to [`i18next.init`](http://i18next.com/pages/doc_init.html). This allows you to override pretty much anything. Read [i18next](http://i18next.com/) doc for more info.

When using the CLI, `outputOverride` and `i18n` options are parsed as JSON.
