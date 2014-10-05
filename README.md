# node-static-i18n

A simple utility to translate static HTML files.


Options:

* `outputDir`: Path for the output (default: '.')
* `outputDefault`: Path for the default locale (default: '__file__.html')
* `outputOther`: Path for the other locales (default: '__lng__/__file__.html')
* `outputOverride`: Override outputDefault or outputOther for special cases (default: {})
  eg:

    ```javascript
    {
      "default": {
        "index.html": "foo.html"
      },
      "ja": {
        "index.html": "ja_index.html"
      }
    }
    ```
