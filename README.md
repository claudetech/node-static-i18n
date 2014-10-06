# node-static-i18n

A simple utility to translate static HTML files.

## Installation

For global installation, needed for CLI uage, run

```sh
$ npm install -g static-i18n
```

Note that you can also use this as a grunt plugin.

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
    "key": "man"
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
    "key": "mec"
  }
}
```

The following command

```sh
$ static-i18n -l en -i en -i ja www
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
  </body>
</html>
```

## Configuration

This tool has several configuration options to adapt to most common use cases.

* `selector` (default: '[data-t]'): The selector to look for elements to translate. If it is an attribute, the attribute content is used as the key when non empty, otherwise the text of the element is used.
* `useAttr` (default: `true`): If `false`, the element text is always used as the key, even if the attribute value is not empty.
* `replace` (default: `false`): If `true`, the element is replaced by the translation. Useful to use something like `<t>my.key</t>` to translate.
* `locales` (default: ['en']): the list of locales to be generated.
  All locales need to have an existing resource file.
* `fixPaths` (default: `true`): When `true`, the `script[src]` and `link[href]`  relative paths are fixed to fit the new subdirectory structure. (See example above.)
* `locale` (default: `en`): The default locale.
* `files` (default: `**/*.html`): The files to translate, relative to the base directory.
* `baseDir` (default: `process.cwd()`): The base directory to look for translations. Not useful for CLI usage as it is overriden by the directory argument.
* `removeAttr` (default: `true`): When `true`, removes the attribute used to translate (e.g. `data-t` will be removed)
* `outputDir` (default: `i18n`): The directory to output generated files
* `outputDefault` (default: `__file__`): The name for the default locale output files, relative to `outputDir`. `__file__` will be replaced by the
 current file name
* `outputDefault` (default: `__lng__/__file__`): The name for the other locales output files, relative to `outputDir`. `__lng__` will be replaced
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
