# node-static-i18n

A simple utility to translate static HTML files.


Options:

* `outputDir`: Path for the output (default: './i18n')
* `outputDefault`: Path for the default locale (default: '__file__')
* `outputOther`: Path for the other locales (default: '__lng__/__file__')
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
