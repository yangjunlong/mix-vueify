/**
 * Parser css to add Vue scopeId
 * 
 * @author  Yang,junlong at 2018-11-15 13:10:00 build.
 * @version $Id$
 */

var postcss = require('postcss');
var selectorParser = require('postcss-selector-parser');
var cache = require('lru-cache')(100);

// 同步输出
var deasync = require('deasync');

var currentId;
var addId = postcss.plugin('add-id', function () {
  return function (root) {
    root.each(function rewriteSelector (node) {
      if (!node.selector) {
        // handle media queries
        if (node.type === 'atrule' && node.name === 'media') {
          node.each(rewriteSelector);
        }
        return
      }
      node.selector = selectorParser(function (selectors) {
        selectors.each(function (selector) {
          var node = null
          selector.each(function (n) {
            if (n.type !== 'pseudo') {
              node = n;
            }
          })
          selector.insertAfter(node, selectorParser.attribute({
            attribute: currentId
          }))
        })
      }).processSync(node);
    })
  }
})

module.exports = deasync(function (id, css, scoped, options, callback) {
  var val = cache.get(id)
  if (val) {
    callback(null, val);
  } else {
    var plugins = [];
    var opts = {};

    // if (options.postcss instanceof Array) {
    //   plugins = options.postcss.slice()
    // } else if (options.postcss instanceof Object) {
    //   plugins = options.postcss.plugins || []
    //   opts = options.postcss.options
    // }

    // scoped css rewrite
    // make sure the addId plugin is only pushed once
    if (scoped && plugins.indexOf(addId) === -1) {
      plugins.push(addId);
    }

    // remove the addId plugin if the style block is not scoped
    if (!scoped && plugins.indexOf(addId) !== -1) {
      plugins.splice(plugins.indexOf(addId), 1);
    }

    // // minification
    // if (process.env.NODE_ENV === 'production') {
    //   plugins.push(require('cssnano')(assign({
    //     safe: true
    //   }, options.cssnano)))
    // }
    currentId = id;

    postcss(plugins).process(css, opts).then(function (res) {
      cache.set(id, res.css);
      callback(null, res.css);
    })
  }
})
