/**
 * Vue单文件组件编译
 * 
 * @author  Yang,junlong at 2018-11-14 15:26:46 build.
 * @version $Id$
 */

var crypto = require('crypto');

var compiler = require('vue-template-compiler');
var transpile = require('vue-template-es2015-compiler');
var babel = require('babel-core');
var preset2015 = require('babel-preset-es2015');

var rewriteStyle = require('./lib/style-rewriter');

module.exports = function(content, secretKey, conf) {
  var output = [];
  var script = '';
  var hash = crypto.createHmac('sha256', secretKey);
  var scopeId =  '_v-' + hash.update(content).digest('hex').substring(0, 8);

  // Parse a SFC (single-file component, or *.vue file) into a descriptor 
  var descriptor = compiler.parseComponent(content.toString(), { pad: true });

  // check for scoped style nodes
  var scoped = descriptor.styles.some(function (style) {
    return style.scoped
  });

  if(descriptor.script) {
  	// babel transform
    script = babel.transform(descriptor.script.content, {
      presets: [preset2015],
    }).code;
  } else {
    script += 'module.exports = {}';
  }

  output.push(script);

  output.push('var __vue__options__;');
  output.push('if(exports && exports.__esModule && exports.default){');
  output.push('  __vue__options__ = exports.default;');
  output.push('}else{');
  output.push('  __vue__options__ = module.exports;');
  output.push('}');

  if(descriptor.template) {
  	var templated = compileTemplate(descriptor.template.content);

  	output.push('__vue__options__.render = ' + templated.render + ';');
    output.push('__vue__options__.staticRenderFns = ' + templated.staticRenderFns + ';');
  }

  if(scoped) {
  	output.push('__vue__options__._scopeId = ' + JSON.stringify(scopeId) + ';');
  }

  var styles = [];
  descriptor.styles.forEach(function(item, index) {
  	var content = item.content.trim();
  	if(!content){
      return;
    }

    // rewrite style add scopedId
    
    content = rewriteStyle(scopeId, content, item.scoped, {});

    styles.push(content);
  });

  if(styles.length > 0) {
  	// mod.js require.loaddCss method support
  	output.push('require.loadCss({content: '+JSON.stringify(styles.join('\n'))+'})');
  }

  console.log(output.join('\n'));
};

// utils
function compileTemplate (template) {
  var compiled = compiler.compile(template)
  if (compiled.errors.length) {
    compiled.errors.forEach(function (msg) {
      console.error('\n' + msg + '\n')
    })
    throw new Error('Vue template compilation failed')
  } else {
    return {
      render: toFunction(compiled.render),
      staticRenderFns: '[' + compiled.staticRenderFns.map(toFunction).join(',') + ']'
    }
  }
}

function toFunction (code) {
  return transpile('function render () {' + code + '}')
}
