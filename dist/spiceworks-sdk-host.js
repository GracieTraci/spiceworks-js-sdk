(function(global) {
/*! spiceworks-sdk - v0.0.1 - 2014-07-24
* http://developers.spiceworks.com
* Copyright (c) 2014 ; Licensed  */
var define, require;

(function() {
  var registry = {}, seen = {};

  define = function(name, deps, callback) {
    registry[name] = { deps: deps, callback: callback };
  };

  require = function(name) {

    if (seen[name]) { return seen[name]; }
    seen[name] = {};

    if (!registry[name]) {
      throw new Error("Could not find module " + name);
    }

    var mod = registry[name],
        deps = mod.deps,
        callback = mod.callback,
        reified = [],
        exports;

    for (var i=0, l=deps.length; i<l; i++) {
      if (deps[i] === 'exports') {
        reified.push(exports = {});
      } else {
        reified.push(require(resolve(deps[i])));
      }
    }

    var value = callback.apply(this, reified);
    return seen[name] = exports || value;

    function resolve(child) {
      if (child.charAt(0) !== '.') { return child; }
      var parts = child.split("/");
      var parentBase = name.split("/").slice(0, -1);

      for (var i=0, l=parts.length; i<l; i++) {
        var part = parts[i];

        if (part === '..') { parentBase.pop(); }
        else if (part === '.') { continue; }
        else { parentBase.push(part); }
      }

      return parentBase.join("/");
    }
  };

  require.entries = registry;
})();

function UUID(){}UUID.generate=function(){var a=UUID._gri,b=UUID._ha;return b(a(32),8)+"-"+b(a(16),4)+"-"+b(16384|a(12),4)+"-"+b(32768|a(14),4)+"-"+b(a(48),12)};UUID._gri=function(a){return 0>a?NaN:30>=a?0|Math.random()*(1<<a):53>=a?(0|1073741824*Math.random())+1073741824*(0|Math.random()*(1<<a-30)):NaN};UUID._ha=function(a,b){for(var c=a.toString(16),d=b-c.length,e="0";0<d;d>>>=1,e+=e)d&1&&(c=e+c);return c};

/*! Kamino v0.0.1 | http://github.com/Cyril-sf/kamino.js | Copyright 2012, Kit Cambridge | http://kit.mit-license.org */
(function(window) {
  // Convenience aliases.
  var getClass = {}.toString, isProperty, forEach, undef;

  Kamino = {};
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = Kamino;
    }
    exports.Kamino = Kamino;
  } else {
    window['Kamino'] = Kamino;
  }

  Kamino.VERSION = '0.1.0';

  KaminoException = function() {
    this.name = "KaminoException";
    this.number = 25;
    this.message = "Uncaught Error: DATA_CLONE_ERR: Kamino Exception 25";
  };

  // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
  var isExtended = new Date(-3509827334573292);
  try {
    // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
    // results for certain dates in Opera >= 10.53.
    isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() == 1 &&
      // Safari < 2.0.2 stores the internal millisecond time value correctly,
      // but clips the values returned by the date methods to the range of
      // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
      isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
  } catch (exception) {}

  // IE <= 7 doesn't support accessing string characters using square
  // bracket notation. IE 8 only supports this for primitives.
  var charIndexBuggy = "A"[0] != "A";

  // Define additional utility methods if the `Date` methods are buggy.
  if (!isExtended) {
    var floor = Math.floor;
    // A mapping between the months of the year and the number of days between
    // January 1st and the first of the respective month.
    var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    // Internal: Calculates the number of days between the Unix epoch and the
    // first day of the given month.
    var getDay = function (year, month) {
      return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
    };
  }

  // Internal: Determines if a property is a direct property of the given
  // object. Delegates to the native `Object#hasOwnProperty` method.
  if (!(isProperty = {}.hasOwnProperty)) {
    isProperty = function (property) {
      var members = {}, constructor;
      if ((members.__proto__ = null, members.__proto__ = {
        // The *proto* property cannot be set multiple times in recent
        // versions of Firefox and SeaMonkey.
        "toString": 1
      }, members).toString != getClass) {
        // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
        // supports the mutable *proto* property.
        isProperty = function (property) {
          // Capture and break the object's prototype chain (see section 8.6.2
          // of the ES 5.1 spec). The parenthesized expression prevents an
          // unsafe transformation by the Closure Compiler.
          var original = this.__proto__, result = property in (this.__proto__ = null, this);
          // Restore the original prototype chain.
          this.__proto__ = original;
          return result;
        };
      } else {
        // Capture a reference to the top-level `Object` constructor.
        constructor = members.constructor;
        // Use the `constructor` property to simulate `Object#hasOwnProperty` in
        // other environments.
        isProperty = function (property) {
          var parent = (this.constructor || constructor).prototype;
          return property in this && !(property in parent && this[property] === parent[property]);
        };
      }
      members = null;
      return isProperty.call(this, property);
    };
  }

  // Internal: Normalizes the `for...in` iteration algorithm across
  // environments. Each enumerated key is yielded to a `callback` function.
  forEach = function (object, callback) {
    var size = 0, Properties, members, property, forEach;

    // Tests for bugs in the current environment's `for...in` algorithm. The
    // `valueOf` property inherits the non-enumerable flag from
    // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
    (Properties = function () {
      this.valueOf = 0;
    }).prototype.valueOf = 0;

    // Iterate over a new instance of the `Properties` class.
    members = new Properties();
    for (property in members) {
      // Ignore all properties inherited from `Object.prototype`.
      if (isProperty.call(members, property)) {
        size++;
      }
    }
    Properties = members = null;

    // Normalize the iteration algorithm.
    if (!size) {
      // A list of non-enumerable properties inherited from `Object.prototype`.
      members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
      // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
      // properties.
      forEach = function (object, callback) {
        var isFunction = getClass.call(object) == "[object Function]", property, length;
        for (property in object) {
          // Gecko <= 1.0 enumerates the `prototype` property of functions under
          // certain conditions; IE does not.
          if (!(isFunction && property == "prototype") && isProperty.call(object, property)) {
            callback(property);
          }
        }
        // Manually invoke the callback for each non-enumerable property.
        for (length = members.length; property = members[--length]; isProperty.call(object, property) && callback(property));
      };
    } else if (size == 2) {
      // Safari <= 2.0.4 enumerates shadowed properties twice.
      forEach = function (object, callback) {
        // Create a set of iterated properties.
        var members = {}, isFunction = getClass.call(object) == "[object Function]", property;
        for (property in object) {
          // Store each property name to prevent double enumeration. The
          // `prototype` property of functions is not enumerated due to cross-
          // environment inconsistencies.
          if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
            callback(property);
          }
        }
      };
    } else {
      // No bugs detected; use the standard `for...in` algorithm.
      forEach = function (object, callback) {
        var isFunction = getClass.call(object) == "[object Function]", property, isConstructor;
        for (property in object) {
          if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
            callback(property);
          }
        }
        // Manually invoke the callback for the `constructor` property due to
        // cross-environment inconsistencies.
        if (isConstructor || isProperty.call(object, (property = "constructor"))) {
          callback(property);
        }
      };
    }
    return forEach(object, callback);
  };

  // Public: Serializes a JavaScript `value` as a string. The optional
  // `filter` argument may specify either a function that alters how object and
  // array members are serialized, or an array of strings and numbers that
  // indicates which properties should be serialized. The optional `width`
  // argument may be either a string or number that specifies the indentation
  // level of the output.

  // Internal: A map of control characters and their escaped equivalents.
  var Escapes = {
    "\\": "\\\\",
    '"': '\\"',
    "\b": "\\b",
    "\f": "\\f",
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t"
  };

  // Internal: Converts `value` into a zero-padded string such that its
  // length is at least equal to `width`. The `width` must be <= 6.
  var toPaddedString = function (width, value) {
    // The `|| 0` expression is necessary to work around a bug in
    // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
    return ("000000" + (value || 0)).slice(-width);
  };

  // Internal: Double-quotes a string `value`, replacing all ASCII control
  // characters (characters with code unit values between 0 and 31) with
  // their escaped equivalents. This is an implementation of the
  // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
  var quote = function (value) {
    var result = '"', index = 0, symbol;
    for (; symbol = value.charAt(index); index++) {
      // Escape the reverse solidus, double quote, backspace, form feed, line
      // feed, carriage return, and tab characters.
      result += '\\"\b\f\n\r\t'.indexOf(symbol) > -1 ? Escapes[symbol] :
        // If the character is a control character, append its Unicode escape
        // sequence; otherwise, append the character as-is.
        (Escapes[symbol] = symbol < " " ? "\\u00" + toPaddedString(2, symbol.charCodeAt(0).toString(16)) : symbol);
    }
    return result + '"';
  };

  // Internal: detects if an object is a DOM element.
  // http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
  var isElement = function(o) {
    return (
      typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
      o && typeof o === "object" && o.nodeType === 1 && typeof o.nodeName==="string"
    );
  };

  // Internal: Recursively serializes an object. Implements the
  // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
  var serialize = function (property, object, callback, properties, whitespace, indentation, stack) {
    var value = object[property], originalClassName, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, any, result,
        regExpSource, regExpModifiers = "";
    if( value instanceof Error || value instanceof Function) {
      throw new KaminoException();
    }
    if( isElement( value ) ) {
      throw new KaminoException();
    }
    if (typeof value == "object" && value) {
      originalClassName = getClass.call(value);
      if (originalClassName == "[object Date]" && !isProperty.call(value, "toJSON")) {
        if (value > -1 / 0 && value < 1 / 0) {
          value = value.toUTCString().replace("GMT", "UTC");
        } else {
          value = null;
        }
      } else if (typeof value.toJSON == "function" && ((originalClassName != "[object Number]" && originalClassName != "[object String]" && originalClassName != "[object Array]") || isProperty.call(value, "toJSON"))) {
        // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
        // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
        // ignores all `toJSON` methods on these objects unless they are
        // defined directly on an instance.
        value = value.toJSON(property);
      }
    }
    if (callback) {
      // If a replacement function was provided, call it to obtain the value
      // for serialization.
      value = callback.call(object, property, value);
    }
    if (value === null) {
      return "null";
    }
    if (value === undefined) {
      return undefined;
    }
    className = getClass.call(value);
    if (className == "[object Boolean]") {
      // Booleans are represented literally.
      return "" + value;
    } else if (className == "[object Number]") {
      // Kamino numbers must be finite. `Infinity` and `NaN` are serialized as
      // `"null"`.
      if( value === Number.POSITIVE_INFINITY ) {
        return "Infinity";
      } else if( value === Number.NEGATIVE_INFINITY ) {
        return "NInfinity";
      } else if( isNaN( value ) ) {
        return "NaN";
      }
      return "" + value;
    } else if (className == "[object RegExp]") {
      // Strings are double-quoted and escaped.
      regExpSource = value.source;
      regExpModifiers += value.ignoreCase ? "i" : "";
      regExpModifiers += value.global ? "g" : "";
      regExpModifiers += value.multiline ? "m" : "";

      regExpSource = quote(charIndexBuggy ? regExpSource.split("") : regExpSource);
      regExpModifiers = quote(charIndexBuggy ? regExpModifiers.split("") : regExpModifiers);

      // Adds the RegExp prefix.
      value = '^' + regExpSource + regExpModifiers;

      return value;
    } else if (className == "[object String]") {
      // Strings are double-quoted and escaped.
      value = quote(charIndexBuggy ? value.split("") : value);

      if( originalClassName == "[object Date]") {
        // Adds the Date prefix.
        value = '%' + value;
      }

      return value;
    }
    // Recursively serialize objects and arrays.
    if (typeof value == "object") {
      // Check for cyclic structures. This is a linear search; performance
      // is inversely proportional to the number of unique nested objects.
      for (length = stack.length; length--;) {
        if (stack[length] === value) {
          return "&" + length;
        }
      }
      // Add the object to the stack of traversed objects.
      stack.push(value);
      results = [];
      // Save the current indentation level and indent one additional level.
      prefix = indentation;
      indentation += whitespace;
      if (className == "[object Array]") {
        // Recursively serialize array elements.
        for (index = 0, length = value.length; index < length; any || (any = true), index++) {
          element = serialize(index, value, callback, properties, whitespace, indentation, stack);
          results.push(element === undef ? "null" : element);
        }
        result = any ? (whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : ("[" + results.join(",") + "]")) : "[]";
      } else {
        // Recursively serialize object members. Members are selected from
        // either a user-specified list of property names, or the object
        // itself.
        forEach(properties || value, function (property) {
          var element = serialize(property, value, callback, properties, whitespace, indentation, stack);
          if (element !== undef) {
            // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
            // is not the empty string, let `member` {quote(property) + ":"}
            // be the concatenation of `member` and the `space` character."
            // The "`space` character" refers to the literal space
            // character, not the `space` {width} argument provided to
            // `JSON.stringify`.
            results.push(quote(charIndexBuggy ? property.split("") : property) + ":" + (whitespace ? " " : "") + element);
          }
          any || (any = true);
        });
        result = any ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
      }
      return result;
    }
  };

  // Public: `Kamino.stringify`. See ES 5.1 section 15.12.3.
  Kamino.stringify = function (source, filter, width) {
    var whitespace, callback, properties;
    if (typeof filter == "function" || typeof filter == "object" && filter) {
      if (getClass.call(filter) == "[object Function]") {
        callback = filter;
      } else if (getClass.call(filter) == "[object Array]") {
        // Convert the property names array into a makeshift set.
        properties = {};
        for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((getClass.call(value) == "[object String]" || getClass.call(value) == "[object Number]") && (properties[value] = 1)));
      }
    }
    if (width) {
      if (getClass.call(width) == "[object Number]") {
        // Convert the `width` to an integer and create a string containing
        // `width` number of space characters.
        if ((width -= width % 1) > 0) {
          for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
        }
      } else if (getClass.call(width) == "[object String]") {
        whitespace = width.length <= 10 ? width : width.slice(0, 10);
      }
    }
    // Opera <= 7.54u2 discards the values associated with empty string keys
    // (`""`) only if they are used directly within an object member list
    // (e.g., `!("" in { "": 1})`).
    return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", []);
  };

  // Public: Parses a source string.
  var fromCharCode = String.fromCharCode;

  // Internal: A map of escaped control characters and their unescaped
  // equivalents.
  var Unescapes = {
    "\\": "\\",
    '"': '"',
    "/": "/",
    "b": "\b",
    "t": "\t",
    "n": "\n",
    "f": "\f",
    "r": "\r"
  };

  // Internal: Stores the parser state.
  var Index, Source, stack;

  // Internal: Resets the parser state and throws a `SyntaxError`.
  var abort = function() {
    Index = Source = null;
    throw SyntaxError();
  };

  var parseString = function(prefix) {
    prefix = prefix || "";
    var source = Source, length = source.length, value, symbol, begin, position;
    // Advance to the next character and parse a Kamino string at the
    // current position. String tokens are prefixed with the sentinel
    // `@` character to distinguish them from punctuators.
    for (value = prefix, Index++; Index < length;) {
      symbol = source[Index];
      if (symbol < " ") {
        // Unescaped ASCII control characters are not permitted.
        abort();
      } else if (symbol == "\\") {
        // Parse escaped Kamino control characters, `"`, `\`, `/`, and
        // Unicode escape sequences.
        symbol = source[++Index];
        if ('\\"/btnfr'.indexOf(symbol) > -1) {
          // Revive escaped control characters.
          value += Unescapes[symbol];
          Index++;
        } else if (symbol == "u") {
          // Advance to the first character of the escape sequence.
          begin = ++Index;
          // Validate the Unicode escape sequence.
          for (position = Index + 4; Index < position; Index++) {
            symbol = source[Index];
            // A valid sequence comprises four hexdigits that form a
            // single hexadecimal value.
            if (!(symbol >= "0" && symbol <= "9" || symbol >= "a" && symbol <= "f" || symbol >= "A" && symbol <= "F")) {
              // Invalid Unicode escape sequence.
              abort();
            }
          }
          // Revive the escaped character.
          value += fromCharCode("0x" + source.slice(begin, Index));
        } else {
          // Invalid escape sequence.
          abort();
        }
      } else {
        if (symbol == '"') {
          // An unescaped double-quote character marks the end of the
          // string.
          break;
        }
        // Append the original character as-is.
        value += symbol;
        Index++;
      }
    }
    if (source[Index] == '"') {
      Index++;
      // Return the revived string.
      return value;
    }
    // Unterminated string.
    abort();
  };

  // Internal: Returns the next token, or `"$"` if the parser has reached
  // the end of the source string. A token may be a string, number, `null`
  // literal, `NaN` literal or Boolean literal.
  var lex = function () {
    var source = Source, length = source.length, symbol, value, begin, position, sign,
        dateString, regExpSource, regExpModifiers;
    while (Index < length) {
      symbol = source[Index];
      if ("\t\r\n ".indexOf(symbol) > -1) {
        // Skip whitespace tokens, including tabs, carriage returns, line
        // feeds, and space characters.
        Index++;
      } else if ("{}[]:,".indexOf(symbol) > -1) {
        // Parse a punctuator token at the current position.
        Index++;
        return symbol;
      } else if (symbol == '"') {
        // Parse strings.
        return parseString("@");
      } else if (symbol == '%') {
        // Parse dates.
        Index++;
        symbol = source[Index];
        if(symbol == '"') {
          dateString = parseString();
          return new Date( dateString );
        }
        abort();
      } else if (symbol == '^') {
        // Parse regular expressions.
        Index++;
        symbol = source[Index];
        if(symbol == '"') {
          regExpSource = parseString();

          symbol = source[Index];
          if(symbol == '"') {
            regExpModifiers = parseString();

            return new RegExp( regExpSource, regExpModifiers );
          }
        }
        abort();
      } else if (symbol == '&') {
        // Parse object references.
        Index++;
        symbol = source[Index];
        if (symbol >= "0" && symbol <= "9") {
          Index++;
          return stack[symbol];
        }
        abort();
      } else {
        // Parse numbers and literals.
        begin = Index;
        // Advance the scanner's position past the sign, if one is
        // specified.
        if (symbol == "-") {
          sign = true;
          symbol = source[++Index];
        }
        // Parse an integer or floating-point value.
        if (symbol >= "0" && symbol <= "9") {
          // Leading zeroes are interpreted as octal literals.
          if (symbol == "0" && (symbol = source[Index + 1], symbol >= "0" && symbol <= "9")) {
            // Illegal octal literal.
            abort();
          }
          sign = false;
          // Parse the integer component.
          for (; Index < length && (symbol = source[Index], symbol >= "0" && symbol <= "9"); Index++);
          // Floats cannot contain a leading decimal point; however, this
          // case is already accounted for by the parser.
          if (source[Index] == ".") {
            position = ++Index;
            // Parse the decimal component.
            for (; position < length && (symbol = source[position], symbol >= "0" && symbol <= "9"); position++);
            if (position == Index) {
              // Illegal trailing decimal.
              abort();
            }
            Index = position;
          }
          // Parse exponents.
          symbol = source[Index];
          if (symbol == "e" || symbol == "E") {
            // Skip past the sign following the exponent, if one is
            // specified.
            symbol = source[++Index];
            if (symbol == "+" || symbol == "-") {
              Index++;
            }
            // Parse the exponential component.
            for (position = Index; position < length && (symbol = source[position], symbol >= "0" && symbol <= "9"); position++);
            if (position == Index) {
              // Illegal empty exponent.
              abort();
            }
            Index = position;
          }
          // Coerce the parsed value to a JavaScript number.
          return +source.slice(begin, Index);
        }
        // A negative sign may only precede numbers.
        if (sign) {
          abort();
        }
        // `true`, `false`, `Infinity`, `-Infinity`, `NaN` and `null` literals.
        if (source.slice(Index, Index + 4) == "true") {
          Index += 4;
          return true;
        } else if (source.slice(Index, Index + 5) == "false") {
          Index += 5;
          return false;
        } else if (source.slice(Index, Index + 8) == "Infinity") {
          Index += 8;
          return Infinity;
        } else if (source.slice(Index, Index + 9) == "NInfinity") {
          Index += 9;
          return -Infinity;
        } else if (source.slice(Index, Index + 3) == "NaN") {
          Index += 3;
          return NaN;
        } else if (source.slice(Index, Index + 4) == "null") {
          Index += 4;
          return null;
        }
        // Unrecognized token.
        abort();
      }
    }
    // Return the sentinel `$` character if the parser has reached the end
    // of the source string.
    return "$";
  };

  // Internal: Parses a Kamino `value` token.
  var get = function (value) {
    var results, any, key;
    if (value == "$") {
      // Unexpected end of input.
      abort();
    }
    if (typeof value == "string") {
      if (value[0] == "@") {
        // Remove the sentinel `@` character.
        return value.slice(1);
      }
      // Parse object and array literals.
      if (value == "[") {
        // Parses a Kamino array, returning a new JavaScript array.
        results = [];
        stack[stack.length] = results;
        for (;; any || (any = true)) {
          value = lex();
          // A closing square bracket marks the end of the array literal.
          if (value == "]") {
            break;
          }
          // If the array literal contains elements, the current token
          // should be a comma separating the previous element from the
          // next.
          if (any) {
            if (value == ",") {
              value = lex();
              if (value == "]") {
                // Unexpected trailing `,` in array literal.
                abort();
              }
            } else {
              // A `,` must separate each array element.
              abort();
            }
          }
          // Elisions and leading commas are not permitted.
          if (value == ",") {
            abort();
          }
          results.push(get(typeof value == "string" && charIndexBuggy ? value.split("") : value));
        }
        return results;
      } else if (value == "{") {
        // Parses a Kamino object, returning a new JavaScript object.
        results = {};
        stack[stack.length] = results;
        for (;; any || (any = true)) {
          value = lex();
          // A closing curly brace marks the end of the object literal.
          if (value == "}") {
            break;
          }
          // If the object literal contains members, the current token
          // should be a comma separator.
          if (any) {
            if (value == ",") {
              value = lex();
              if (value == "}") {
                // Unexpected trailing `,` in object literal.
                abort();
              }
            } else {
              // A `,` must separate each object member.
              abort();
            }
          }
          // Leading commas are not permitted, object property names must be
          // double-quoted strings, and a `:` must separate each property
          // name and value.
          if (value == "," || typeof value != "string" || value[0] != "@" || lex() != ":") {
            abort();
          }
          var result = lex();
          results[value.slice(1)] = get(typeof result == "string" && charIndexBuggy ? result.split("") : result);
        }
        return results;
      }
      // Unexpected token encountered.
      abort();
    }
    return value;
  };

  // Internal: Updates a traversed object member.
  var update = function(source, property, callback) {
    var element = walk(source, property, callback);
    if (element === undef) {
      delete source[property];
    } else {
      source[property] = element;
    }
  };

  // Internal: Recursively traverses a parsed Kamino object, invoking the
  // `callback` function for each value. This is an implementation of the
  // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
  var walk = function (source, property, callback) {
    var value = source[property], length;
    if (typeof value == "object" && value) {
      if (getClass.call(value) == "[object Array]") {
        for (length = value.length; length--;) {
          update(value, length, callback);
        }
      } else {
        // `forEach` can't be used to traverse an array in Opera <= 8.54,
        // as `Object#hasOwnProperty` returns `false` for array indices
        // (e.g., `![1, 2, 3].hasOwnProperty("0")`).
        forEach(value, function (property) {
          update(value, property, callback);
        });
      }
    }
    return callback.call(source, property, value);
  };

  // Public: `Kamino.parse`. See ES 5.1 section 15.12.2.
  Kamino.parse = function (source, callback) {
    var result, value;
    Index = 0;
    Source = "" + source;
    stack = [];
    if (charIndexBuggy) {
      Source = source.split("");
    }
    result = get(lex());
    // If a Kamino string contains multiple tokens, it is invalid.
    if (lex() != "$") {
      abort();
    }
    // Reset the parser state.
    Index = Source = null;
    return callback && getClass.call(callback) == "[object Function]" ? walk((value = {}, value[""] = result, value), "", callback) : result;
  };

  Kamino.clone = function(source) {
    return Kamino.parse( Kamino.stringify(source) );
  };
})(this);

(function(root) {
  var self = root,
      Window = self.Window,
      usePoly = false,
      a_slice = [].slice;

  function isFunction(functionToCheck) {
    return functionToCheck && Object.prototype.toString.call(functionToCheck) === '[object Function]';
  }

  function isInWorker() {
    return  typeof Worker === 'undefined' && typeof Window === 'undefined';
  }

  if( usePoly || !self.MessageChannel ) {

    var isWindowToWindowMessage = function( currentTarget ) {
          return typeof window !== "undefined" && self instanceof Window && ( !isFunction(self.Worker) || !(currentTarget instanceof Worker) );
        },
        log = function( message ) {
          if (MessageChannel.verbose) {
            var args = a_slice.apply(arguments);
            args.unshift("MCNP: ");
            console.log.apply(console, args);
          }
        },
        messagePorts = {};

    var MessagePort = self.MessagePort = function( uuid ) {
      this._entangledPortUuid = null;
      this.destinationUrl = null;
      this._listeners = {};
      this._messageQueue = [];
      this._messageQueueEnabled = false;
      this._currentTarget = null;

      this.uuid = uuid || UUID.generate();
      messagePorts[this.uuid] = this;
      this.log("created");
    };

    MessagePort.prototype = {
      start: function() {
        var event,
            self = this;

        // TODO: we have no guarantee that
        // we will not receive and process events in the correct order
        setTimeout( function() {
          self.log('draining ' + self._messageQueue.length + ' queued messages');
          while( self._messageQueueEnabled && (event = self._messageQueue.shift()) ) {
            self.dispatchEvent( event );
          }
        });
        this._messageQueueEnabled = true;
        this.log('started');
      },

      close: function() {
        this._messageQueueEnabled = false;
        if( this._entangledPortUuid ) {
          this._getEntangledPort()._entangledPortUuid = null;
          this._entangledPortUuid = null;

          // /!\ Probably need to send that (?)
        }
      },

      postMessage: function( message ) {
        // Numbers refer to step from the W3C specs. It shows how simplified things are
        // 1- Let target port be the port with which source port is entangled, if any
        var target = this._getEntangledPort(),
            currentTarget = this._currentTarget,
            messageClone;


        // 8- If there is no target port (i.e. if source port is not entangled), then abort these steps.
        if(!target) {
          this.log("not entangled, discarding message", message);
          return;
        }

        // 12- Add the event to the port message queue of target port.
        // As the port is cloned when sent to the other user agent,
        // posting a message can mean different things:
        // * The port is still local, then we need to queue the event
        // * the port has been sent, then we need to send that event
        if( currentTarget ) {
          // 5- Let message clone be the result of obtaining a structured clone of the message argument
          messageClone = MessageChannel.encodeEvent( message, [target], true );

          if( isWindowToWindowMessage( currentTarget ) ) {
            this.log("posting message from window to window", message, this.destinationUrl);
            currentTarget.postMessage(messageClone, this.destinationUrl);
          } else {
            this.log("posting message from or to worker", message);
            currentTarget.postMessage(messageClone);
          }
        } else {
          this.log("not connected, queueing message", message);
          target._enqueueEvent(MessageChannel._messageEvent(message, [target], true));
        }
      },

      addEventListener: function( type, listener ) {
        if (typeof this._listeners[type] === "undefined"){
          this._listeners[type] = [];
        }

        this._listeners[type].push( listener );
      },

      removeEventListener: function( type, listener) {
        if (this._listeners[type] instanceof Array){
          var listeners = this._listeners[type];
          for (var i=0; i < listeners.length; i++){
            if (listeners[i] === listener){
              listeners.splice(i, 1);
              break;
            }
          }
        }
      },

      dispatchEvent: function( event ) {
        var listeners = this._listeners.message;
        if( listeners ) {
          for (var i=0; i < listeners.length; i++){
            listeners[i].call(this, event);
          }
        }
      },

      _enqueueEvent: function( event ) {
        if(this._messageQueueEnabled) {
          this.dispatchEvent( event );
        } else {
          this._messageQueue.push( event );
        }
      },

      _getPort: function( portClone, messageEvent, copyEvents ) {
        var loadPort = function(uuid) {
          var port = messagePorts[uuid] || MessageChannel._createPort(uuid);
          return port;
        };

        var port = loadPort(portClone.uuid);
        port._entangledPortUuid = portClone._entangledPortUuid;
        port._getEntangledPort()._entangledPortUuid = port.uuid;
        port._currentTarget =  messageEvent.source || messageEvent.currentTarget || self;
        if( messageEvent.origin === "null" ) {
          port.destinationUrl = "*";
        } else {
          port.destinationUrl = messageEvent.origin;
        }

        if( copyEvents ) {
          for( var i=0 ; i < portClone._messageQueue.length ; i++ ) {
            port._messageQueue.push( portClone._messageQueue[i] );
          }
        }

        return port;
      },

      _getEntangledPort: function() {
        if( this._entangledPortUuid ) {
          return messagePorts[ this._entangledPortUuid ] || MessageChannel._createPort(this._entangledPortUuid);
        } else {
          return null;
        }
      },

      log: function () {
        if (MessageChannel.verbose) {
          var args = a_slice.apply(arguments);
          args.unshift("Port", this.uuid);
          log.apply(null, args);
        }
      }
    };

    var MessageChannel = self.MessageChannel = function () {
      var port1 = MessageChannel._createPort(),
          port2 = MessageChannel._createPort(),
          channel;

      port1._entangledPortUuid = port2.uuid;
      port2._entangledPortUuid = port1.uuid;

      channel = {
        port1: port1,
        port2: port2
      };

      MessageChannel.log(channel, "created");

      return channel;
    };

    MessageChannel.log = function (_channel) {
      if (MessageChannel.verbose) {
        var args = ["Chnl"],
            msgArgs = a_slice.call(arguments, 1);

        if (_channel.port1 && _channel.port2) {
          args.push(_channel.port1.uuid, _channel.port2.uuid);
        } else {
          _channel.forEach( function(channel) {
            args.push(channel._entangledPortUuid);
          });
        }

        args.push.apply(args, msgArgs);
        log.apply(null, args);
      }
    };

    MessageChannel._createPort = function() {
      var args = arguments,
          MessagePortConstructor = function() {
            return MessagePort.apply(this, args);
          };

      MessagePortConstructor.prototype = MessagePort.prototype;

      return new MessagePortConstructor();
    };

    /**
        Encode the event to be sent.

        messageEvent.data contains a fake Event encoded with Kamino.js

        It contains:
        * data: the content that the MessagePort should send
        * ports: The targeted MessagePorts.
        * messageChannel: this allows to decide if the MessageEvent was meant for the window or the port

        @param {Object} data
        @param {Array} ports
        @param {Boolean} messageChannel
        @returns {String} a string representation of the data to be sent
    */
    MessageChannel.encodeEvent = function( data, ports, messageChannel ) {
      var strippedPorts = new Array(ports.length),
          encodedMessage, messageEvent;

      for (var i = 0; i < ports.length; ++i) {
        strippedPorts[i] = MessageChannel._strippedPort(ports[i]);
      }

      messageEvent = { event: MessageChannel._messageEvent(data, strippedPorts, messageChannel) };
      encodedMessage = Kamino.stringify(messageEvent);

      return encodedMessage;
    };

    MessageChannel._messageEvent = function(data, ports, messageChannel) {
      return  { data: data, ports: ports, messageChannel: messageChannel};
    };

    MessageChannel._strippedPort = function (port) {
      if (!port) { return; }

      var messageQueue = [];
      for (var msg, msgPorts, ports, i = 0; i < port._messageQueue.length; ++i) {
        msg = port._messageQueue[i];
        msgPorts = msg.ports || [];
        ports = [];

        for (var portRef, j = 0; j < msgPorts.length; ++j) {
          portRef = msgPorts[j];
          ports.push({
            uuid: portRef.uuid,
            _entangledPortUuid: portRef._entangledPortUuid
          });
        }
        messageQueue.push({
          data: msg.data,
          messageChannel: msg.messageChannel,
          ports: ports
        });
      }

      return {
        uuid: port.uuid,
        _entangledPortUuid: port._entangledPortUuid,
        _messageQueue: messageQueue
      };
    };

    /**
        Extract the event from the message.

        messageEvent.data contains a fake Event encoded with Kamino.js

        It contains:
        * data: the content that the MessagePort should use
        * ports: The targeted MessagePorts.
        * messageChannel: this allows to decide if the MessageEvent was meant for the window or the port

        @param {MessageEvent} messageEvent
        @param {Boolean} copyEvents: copy or not the events from the cloned port to the local one
        @returns {Object} an object that fakes an event with limited attributes ( data, ports )
    */
    MessageChannel.decodeEvent = function( messageEvent, copyEvents ) {
      var fakeEvent = {
            data: null,
            ports: []
          },
          data = Kamino.parse( messageEvent.data ),
          event = data.event,
          ports = event.ports;

      if( event ) {
        if( ports ) {
          for(var i=0; i< ports.length ; i++) {
            fakeEvent.ports.push( MessagePort.prototype._getPort( ports[i], messageEvent, copyEvents ) );
          }
        }
        fakeEvent.data = event.data;
        fakeEvent.source = messageEvent.source;
        fakeEvent.messageChannel = event.messageChannel;
      }

      return fakeEvent;
    };

    /**
        Extract the event from the message if possible.

        A user agent can received events that are not encoded using Kamino.

        @param {MessageEvent} messageEvent
        @param {Boolean} copyEvents: copy or not the events from the cloned port to the local one
        @returns {Object} an object that fakes an event or the triggered event
    */
    var decodeEvent = function( event, copyEvents ) {
      var messageEvent;

      try {
        messageEvent = MessageChannel.decodeEvent( event, copyEvents );
      } catch( e ) {
        if( e instanceof SyntaxError ) {
          messageEvent = event;
        } else {
          throw e;
        }
      }

      return messageEvent;
    };

    var propagationHandler = function( event ) {
      var messageEvent = decodeEvent( event, true );

      if( messageEvent.messageChannel ) {
        MessageChannel.propagateEvent( messageEvent );
      }
    };

    // Add the default message event handler
    // This is useful so that a user agent can pass ports
    // without declaring any event handler.
    //
    // This handler takes care of copying the events queue passed with a port.
    // We only need to perform this when passing a port between user agents,
    // otherwise the event is passed through `postMessage` and not through the queue
    // and is handled by the port's message listener.
    //
    // Ex:
    //    iFrame1 - iFrame2 - iFrame3
    //    iFrame2 creates a MessageChannel and passes a port to each iframe
    //    we need a default handler to receive MessagePorts' events
    //    and to propagate them
    var _addMessagePortEventHandler = function( target ) {
      if( target.addEventListener ) {
        target.addEventListener( 'message', propagationHandler, false );
      } else if( target.attachEvent ) {
        target.attachEvent( 'onmessage', propagationHandler );
      }
    };

    var _overrideMessageEventListener = function( target ) {
      var originalAddEventListener, addEventListenerName,
          targetRemoveEventListener, removeEventListenerName,
          messageEventType,
          messageHandlers = [];

      if( target.addEventListener ) {
        addEventListenerName = 'addEventListener';
        removeEventListenerName = 'removeEventListener';
        messageEventType = 'message';
      } else if( target.attachEvent ) {
        addEventListenerName = 'attachEvent';
        removeEventListenerName = 'detachEvent';
        messageEventType = 'onmessage';
      }
      originalAddEventListener = target[addEventListenerName];
      targetRemoveEventListener = target[removeEventListenerName];

      target[addEventListenerName] = function() {
        var args = Array.prototype.slice.call( arguments ),
            originalHandler = args[1],
            self = this,
            messageHandlerWrapper;

        if( args[0] === messageEventType ) {
          messageHandlerWrapper = function( event ) {
            var messageEvent = decodeEvent( event );

            if( ! messageEvent.messageChannel ) {
              originalHandler.call( self, messageEvent );
            }
          };
          originalHandler.messageHandlerWrapper = messageHandlerWrapper;

          args[1] = messageHandlerWrapper;
        }

        originalAddEventListener.apply( this, args );
      };

      target[removeEventListenerName] = function() {
        var args = Array.prototype.slice.call( arguments ),
            originalHandler = args[1];

        if( args[0] === messageEventType ) {
          args[1] = originalHandler.messageHandlerWrapper;
          delete originalHandler.messageHandlerWrapper;
        }

        if( args[1] ) {
          targetRemoveEventListener.apply( this, args );
        }
      };
    };


    /**
        Send the event to the targeted ports

        It uses the `messageChannel` attribute to decide
        if the event is meant for the window or MessagePorts

        @param {Object} fakeEvent
    */
    MessageChannel.propagateEvent = function( fakeEvent ) {
      var ports, port, entangledPort;

      if( fakeEvent.messageChannel ) {
        ports = fakeEvent.ports;

        for( var i=0 ; i<ports.length ; i++) {
          port = ports[i];
          entangledPort = port._getEntangledPort();

          if( port._currentTarget && entangledPort._currentTarget ) {
            entangledPort.postMessage( fakeEvent.data );
          } else {
            port._enqueueEvent( fakeEvent );
          }
        }
      }
    };

    MessageChannel.reset = function() {
      messagePorts = {};
    };

    //
    _addMessagePortEventHandler( self );

    /**
        Send the MessagePorts to the other window

        `window.postMessage` doesn't accept fake ports so we have to encode them
        and pass them in the message.

        @param {Object} otherWindow: A reference to another window.
        @param {Object} message: Data to be sent to the other window.
        @param {String} targetOrigin: Specifies what the origin of otherWindow must be for the event to be dispatched.
        @param {Array} ports: MessagePorts that need to be sent to otherWindow.
    */
    if( Window ) {
      Window.postMessage = function( otherWindow, message, targetOrigin, ports ) {
        var data, entangledPort;

        // Internet Explorer requires the `ports` parameter
        ports = ports || [];

        data = MessageChannel.encodeEvent( message, ports, false );

        if( ports ) {
          // We need to know if a port has been sent to another user agent
          // to decide when to queue and when to send messages
          // See `MessageChannel.propagateEvent`
          for( var i=0 ; i<ports.length ; i++) {
            entangledPort = ports[i]._getEntangledPort();
            if( !entangledPort._currentTarget ) {
              entangledPort._currentTarget = otherWindow;
              entangledPort.destinationUrl = targetOrigin;
            }
          }
        }

        MessageChannel.log(ports, "handshake window", otherWindow);
        otherWindow.postMessage(data, targetOrigin);
      };

      // Juggling to find where to override `addEventListener`
      // Firefox 30.0a1 (2014-02-17) adds `addEventListener` on the global object
      // Internet Explorer doesn't allow to override `window.attachEvent`
      var target;
      if( window.addEventListener ) {
        target = window;
      } else if( window.attachEvent ) {
        target = Window.prototype;
      } else {
        throw "We couldn't find a method to attach an event handler.";
      }

      _overrideMessageEventListener( target );
    } else {
      //Worker
      _overrideMessageEventListener( self );
    }

    if( self.Worker ) {
      var OriginalWorker = Worker,
          originalAddEventListener;

      if( OriginalWorker.prototype.addEventListener ) {
        originalAddEventListener = OriginalWorker.prototype.addEventListener;
      } else if( OriginalWorker.prototype.attachEvent ) {
        originalAddEventListener = OriginalWorker.prototype.attachEvent;
      }

      self.Worker = function() {
        var worker = new OriginalWorker(arguments[0]),
            _addEventListener = originalAddEventListener;

        _addEventListener.call(worker, 'message', propagationHandler);

        return worker;
      };
      Worker.prototype = OriginalWorker.prototype;

      _overrideMessageEventListener( Worker.prototype );

    } else if (isInWorker()) {
      self.Worker = { };
    }

    if (self.Worker) {
      self.Worker.postMessage = function( worker, message, transferList )  {
        var data = MessageChannel.encodeEvent( message, transferList, false ),
            entangledPort;

        for( var i=0 ; i<transferList.length ; i++) {
          entangledPort = transferList[i]._getEntangledPort();
          entangledPort._currentTarget = worker;
        }

        MessageChannel.log(transferList, "handshake worker", worker);
        worker.postMessage( data );
      };
    }
  } else {
    if( Window ) {
      Window.postMessage = function( source, message, targetOrigin, ports ) {
        // Internet Explorer requires the `ports` parameter
        ports = ports || [];
        source.postMessage( message, targetOrigin, ports );
      };
    } else {
      // Web worker
      self.Worker = {
        postMessage: function( worker, message, transferList ) {
          worker.postMessage( message, transferList );
        }
      };
    }

    if( self.Worker ) {
      self.Worker.postMessage = function( worker, message, transferList )  {
        worker.postMessage( message, transferList);
      };
    }
  }
})(this);

define("rsvp/all",
  ["rsvp/promise","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Promise = __dependency1__.Promise;
    /* global toString */


    function all(promises) {
      if (Object.prototype.toString.call(promises) !== "[object Array]") {
        throw new TypeError('You must pass an array to all.');
      }

      return new Promise(function(resolve, reject) {
        var results = [], remaining = promises.length,
        promise;

        if (remaining === 0) {
          resolve([]);
        }

        function resolver(index) {
          return function(value) {
            resolveAll(index, value);
          };
        }

        function resolveAll(index, value) {
          results[index] = value;
          if (--remaining === 0) {
            resolve(results);
          }
        }

        for (var i = 0; i < promises.length; i++) {
          promise = promises[i];

          if (promise && typeof promise.then === 'function') {
            promise.then(resolver(i), reject);
          } else {
            resolveAll(i, promise);
          }
        }
      });
    }


    __exports__.all = all;
  });
define("rsvp/async",
  ["exports"],
  function(__exports__) {
    "use strict";
    var browserGlobal = (typeof window !== 'undefined') ? window : {};
    var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
    var local = (typeof global !== 'undefined') ? global : this;

    // node
    function useNextTick() {
      return function() {
        process.nextTick(flush);
      };
    }

    function useMutationObserver() {
      var observer = new BrowserMutationObserver(flush);
      var element = document.createElement('div');
      observer.observe(element, { attributes: true });

      // Chrome Memory Leak: https://bugs.webkit.org/show_bug.cgi?id=93661
      window.addEventListener('unload', function(){
        observer.disconnect();
        observer = null;
      }, false);

      return function() {
        element.setAttribute('drainQueue', 'drainQueue');
      };
    }

    function useSetTimeout() {
      return function() {
        local.setTimeout(flush, 1);
      };
    }

    var queue = [];
    function flush() {
      for (var i = 0; i < queue.length; i++) {
        var tuple = queue[i];
        var callback = tuple[0], arg = tuple[1];
        callback(arg);
      }
      queue = [];
    }

    var scheduleFlush;

    // Decide what async method to use to triggering processing of queued callbacks:
    if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
      scheduleFlush = useNextTick();
    } else if (BrowserMutationObserver) {
      scheduleFlush = useMutationObserver();
    } else {
      scheduleFlush = useSetTimeout();
    }

    function async(callback, arg) {
      var length = queue.push([callback, arg]);
      if (length === 1) {
        // If length is 1, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        scheduleFlush();
      }
    }


    __exports__.async = async;
  });
define("rsvp/config",
  ["rsvp/async","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var async = __dependency1__.async;

    var config = {};
    config.async = async;


    __exports__.config = config;
  });
define("rsvp/defer",
  ["rsvp/promise","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Promise = __dependency1__.Promise;

    function defer() {
      var deferred = {
        // pre-allocate shape
        resolve: undefined,
        reject:  undefined,
        promise: undefined
      };

      deferred.promise = new Promise(function(resolve, reject) {
        deferred.resolve = resolve;
        deferred.reject = reject;
      });

      return deferred;
    }


    __exports__.defer = defer;
  });
define("rsvp/events",
  ["exports"],
  function(__exports__) {
    "use strict";
    var Event = function(type, options) {
      this.type = type;

      for (var option in options) {
        if (!options.hasOwnProperty(option)) { continue; }

        this[option] = options[option];
      }
    };

    var indexOf = function(callbacks, callback) {
      for (var i=0, l=callbacks.length; i<l; i++) {
        if (callbacks[i][0] === callback) { return i; }
      }

      return -1;
    };

    var callbacksFor = function(object) {
      var callbacks = object._promiseCallbacks;

      if (!callbacks) {
        callbacks = object._promiseCallbacks = {};
      }

      return callbacks;
    };

    var EventTarget = {
      mixin: function(object) {
        object.on = this.on;
        object.off = this.off;
        object.trigger = this.trigger;
        return object;
      },

      on: function(eventNames, callback, binding) {
        var allCallbacks = callbacksFor(this), callbacks, eventName;
        eventNames = eventNames.split(/\s+/);
        binding = binding || this;

        while (eventName = eventNames.shift()) {
          callbacks = allCallbacks[eventName];

          if (!callbacks) {
            callbacks = allCallbacks[eventName] = [];
          }

          if (indexOf(callbacks, callback) === -1) {
            callbacks.push([callback, binding]);
          }
        }
      },

      off: function(eventNames, callback) {
        var allCallbacks = callbacksFor(this), callbacks, eventName, index;
        eventNames = eventNames.split(/\s+/);

        while (eventName = eventNames.shift()) {
          if (!callback) {
            allCallbacks[eventName] = [];
            continue;
          }

          callbacks = allCallbacks[eventName];

          index = indexOf(callbacks, callback);

          if (index !== -1) { callbacks.splice(index, 1); }
        }
      },

      trigger: function(eventName, options) {
        var allCallbacks = callbacksFor(this),
            callbacks, callbackTuple, callback, binding, event;

        if (callbacks = allCallbacks[eventName]) {
          // Don't cache the callbacks.length since it may grow
          for (var i=0; i<callbacks.length; i++) {
            callbackTuple = callbacks[i];
            callback = callbackTuple[0];
            binding = callbackTuple[1];

            if (typeof options !== 'object') {
              options = { detail: options };
            }

            event = new Event(eventName, options);
            callback.call(binding, event);
          }
        }
      }
    };


    __exports__.EventTarget = EventTarget;
  });
define("rsvp/hash",
  ["rsvp/defer","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var defer = __dependency1__.defer;

    function size(object) {
      var s = 0;

      for (var prop in object) {
        s++;
      }

      return s;
    }

    function hash(promises) {
      var results = {}, deferred = defer(), remaining = size(promises);

      if (remaining === 0) {
        deferred.resolve({});
      }

      var resolver = function(prop) {
        return function(value) {
          resolveAll(prop, value);
        };
      };

      var resolveAll = function(prop, value) {
        results[prop] = value;
        if (--remaining === 0) {
          deferred.resolve(results);
        }
      };

      var rejectAll = function(error) {
        deferred.reject(error);
      };

      for (var prop in promises) {
        if (promises[prop] && typeof promises[prop].then === 'function') {
          promises[prop].then(resolver(prop), rejectAll);
        } else {
          resolveAll(prop, promises[prop]);
        }
      }

      return deferred.promise;
    }


    __exports__.hash = hash;
  });
define("rsvp/node",
  ["rsvp/promise","rsvp/all","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Promise = __dependency1__.Promise;
    var all = __dependency2__.all;

    function makeNodeCallbackFor(resolve, reject) {
      return function (error, value) {
        if (error) {
          reject(error);
        } else if (arguments.length > 2) {
          resolve(Array.prototype.slice.call(arguments, 1));
        } else {
          resolve(value);
        }
      };
    }

    function denodeify(nodeFunc) {
      return function()  {
        var nodeArgs = Array.prototype.slice.call(arguments), resolve, reject;
        var thisArg = this;

        var promise = new Promise(function(nodeResolve, nodeReject) {
          resolve = nodeResolve;
          reject = nodeReject;
        });

        all(nodeArgs).then(function(nodeArgs) {
          nodeArgs.push(makeNodeCallbackFor(resolve, reject));

          try {
            nodeFunc.apply(thisArg, nodeArgs);
          } catch(e) {
            reject(e);
          }
        });

        return promise;
      };
    }


    __exports__.denodeify = denodeify;
  });
define("rsvp/promise",
  ["rsvp/config","rsvp/events","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var config = __dependency1__.config;
    var EventTarget = __dependency2__.EventTarget;

    function objectOrFunction(x) {
      return isFunction(x) || (typeof x === "object" && x !== null);
    }

    function isFunction(x){
      return typeof x === "function";
    }

    var Promise = function(resolver) {
      var promise = this,
      resolved = false;

      if (typeof resolver !== 'function') {
        throw new TypeError('You must pass a resolver function as the sole argument to the promise constructor');
      }

      if (!(promise instanceof Promise)) {
        return new Promise(resolver);
      }

      var resolvePromise = function(value) {
        if (resolved) { return; }
        resolved = true;
        resolve(promise, value);
      };

      var rejectPromise = function(value) {
        if (resolved) { return; }
        resolved = true;
        reject(promise, value);
      };

      this.on('promise:failed', function(event) {
        this.trigger('error', { detail: event.detail });
      }, this);

      this.on('error', onerror);

      try {
        resolver(resolvePromise, rejectPromise);
      } catch(e) {
        rejectPromise(e);
      }
    };

    function onerror(event) {
      if (config.onerror) {
        config.onerror(event.detail);
      }
    }

    var invokeCallback = function(type, promise, callback, event) {
      var hasCallback = isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        try {
          value = callback(event.detail);
          succeeded = true;
        } catch(e) {
          failed = true;
          error = e;
        }
      } else {
        value = event.detail;
        succeeded = true;
      }

      if (handleThenable(promise, value)) {
        return;
      } else if (hasCallback && succeeded) {
        resolve(promise, value);
      } else if (failed) {
        reject(promise, error);
      } else if (type === 'resolve') {
        resolve(promise, value);
      } else if (type === 'reject') {
        reject(promise, value);
      }
    };

    Promise.prototype = {
      constructor: Promise,

      isRejected: undefined,
      isFulfilled: undefined,
      rejectedReason: undefined,
      fulfillmentValue: undefined,

      then: function(done, fail) {
        this.off('error', onerror);

        var thenPromise = new this.constructor(function() {});

        if (this.isFulfilled) {
          config.async(function(promise) {
            invokeCallback('resolve', thenPromise, done, { detail: promise.fulfillmentValue });
          }, this);
        }

        if (this.isRejected) {
          config.async(function(promise) {
            invokeCallback('reject', thenPromise, fail, { detail: promise.rejectedReason });
          }, this);
        }

        this.on('promise:resolved', function(event) {
          invokeCallback('resolve', thenPromise, done, event);
        });

        this.on('promise:failed', function(event) {
          invokeCallback('reject', thenPromise, fail, event);
        });

        return thenPromise;
      },

      fail: function(fail) {
        return this.then(null, fail);
      }
    };

    EventTarget.mixin(Promise.prototype);

    function resolve(promise, value) {
      if (promise === value) {
        fulfill(promise, value);
      } else if (!handleThenable(promise, value)) {
        fulfill(promise, value);
      }
    }

    function handleThenable(promise, value) {
      var then = null,
      resolved;

      try {
        if (promise === value) {
          throw new TypeError("A promises callback cannot return that same promise.");
        }

        if (objectOrFunction(value)) {
          then = value.then;

          if (isFunction(then)) {
            then.call(value, function(val) {
              if (resolved) { return true; }
              resolved = true;

              if (value !== val) {
                resolve(promise, val);
              } else {
                fulfill(promise, val);
              }
            }, function(val) {
              if (resolved) { return true; }
              resolved = true;

              reject(promise, val);
            });

            return true;
          }
        }
      } catch (error) {
        reject(promise, error);
        return true;
      }

      return false;
    }

    function fulfill(promise, value) {
      config.async(function() {
        promise.trigger('promise:resolved', { detail: value });
        promise.isFulfilled = true;
        promise.fulfillmentValue = value;
      });
    }

    function reject(promise, value) {
      config.async(function() {
        promise.trigger('promise:failed', { detail: value });
        promise.isRejected = true;
        promise.rejectedReason = value;
      });
    }


    __exports__.Promise = Promise;
  });
define("rsvp/reject",
  ["rsvp/promise","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Promise = __dependency1__.Promise;

    function reject(reason) {
      return new Promise(function (resolve, reject) {
        reject(reason);
      });
    }


    __exports__.reject = reject;
  });
define("rsvp/resolve",
  ["rsvp/promise","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Promise = __dependency1__.Promise;

    function resolve(thenable) {
      return new Promise(function(resolve, reject) {
        resolve(thenable);
      });
    }


    __exports__.resolve = resolve;
  });
define("rsvp/rethrow",
  ["exports"],
  function(__exports__) {
    "use strict";
    var local = (typeof global === "undefined") ? this : global;

    function rethrow(reason) {
      local.setTimeout(function() {
        throw reason;
      });
      throw reason;
    }


    __exports__.rethrow = rethrow;
  });
define("rsvp",
  ["rsvp/events","rsvp/promise","rsvp/node","rsvp/all","rsvp/hash","rsvp/rethrow","rsvp/defer","rsvp/config","rsvp/resolve","rsvp/reject","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __dependency9__, __dependency10__, __exports__) {
    "use strict";
    var EventTarget = __dependency1__.EventTarget;
    var Promise = __dependency2__.Promise;
    var denodeify = __dependency3__.denodeify;
    var all = __dependency4__.all;
    var hash = __dependency5__.hash;
    var rethrow = __dependency6__.rethrow;
    var defer = __dependency7__.defer;
    var config = __dependency8__.config;
    var resolve = __dependency9__.resolve;
    var reject = __dependency10__.reject;

    function configure(name, value) {
      config[name] = value;
    }


    __exports__.Promise = Promise;
    __exports__.EventTarget = EventTarget;
    __exports__.all = all;
    __exports__.hash = hash;
    __exports__.rethrow = rethrow;
    __exports__.defer = defer;
    __exports__.denodeify = denodeify;
    __exports__.configure = configure;
    __exports__.resolve = resolve;
    __exports__.reject = reject;
  });
define("oasis", 
  ["rsvp","oasis/logger","oasis/version","oasis/util","oasis/config","oasis/sandbox","oasis/sandbox_init","oasis/xhr","oasis/events","oasis/service","oasis/connect","oasis/iframe_adapter","oasis/webworker_adapter","oasis/inline_adapter","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __dependency9__, __dependency10__, __dependency11__, __dependency12__, __dependency13__, __dependency14__, __exports__) {
    "use strict";
    var RSVP = __dependency1__;
    var logger = __dependency2__["default"];
    var Version = __dependency3__["default"];
    var assert = __dependency4__.assert;
    var delegate = __dependency4__.delegate;
    var OasisConfiguration = __dependency5__["default"];
    var Sandbox = __dependency6__["default"];
    var autoInitializeSandbox = __dependency7__["default"];
    var xhr = __dependency8__.xhr;
    var Events = __dependency9__["default"];

    var Service = __dependency10__["default"];
    var connect = __dependency11__.connect;
    var connectCapabilities = __dependency11__.connectCapabilities;
    var portFor = __dependency11__.portFor;

    var IframeAdapter = __dependency12__["default"];
    var WebworkerAdapter = __dependency13__["default"];
    var InlineAdapter = __dependency14__["default"];

    function Oasis() {
      // Data structures used by Oasis when creating sandboxes
      this.packages = {};
      this.requestId = 0;
      this.oasisId = 'oasis' + (+new Date());

      this.consumers = {};
      this.services = [];

      // Data structures used when connecting to a parent sandbox
      this.ports = {};
      this.handlers = {};

      this.receivedPorts = false;

      this.configuration = new OasisConfiguration();
      this.events = new Events();

      this.didCreate();
    }

    Oasis.Version = Version;
    Oasis.Service = Oasis.Consumer = Service;
    Oasis.RSVP = RSVP;

    Oasis.reset = function () {
      Oasis.adapters = {
        iframe: new IframeAdapter(),
        webworker: new WebworkerAdapter(),
        inline: new InlineAdapter()
      };
    };

    Oasis.reset();

    Oasis.prototype = {
      logger: logger,
      log: function () {
        this.logger.log.apply(this.logger, arguments);
      },

      on: delegate('events', 'on'),
      off: delegate('events', 'off'),
      trigger: delegate('events', 'trigger'),

      didCreate: function() {},

      xhr: xhr,

      /**
        This is the entry point that allows the containing environment to create a
        child sandbox.

        Options:

        * `capabilities`: an array of registered services
        * `url`: a registered URL to a JavaScript file that will initialize the
          sandbox in the sandboxed environment
        * `adapter`: a reference to an adapter that will handle the lifecycle
          of the sandbox. Right now, there are iframe and web worker adapters.

        @param {Object} options
      */
      createSandbox: function (options) {
        return new Sandbox(this, options);
      },

      /**
        This registers a sandbox type inside of the containing environment so that
        it can be referenced by URL in `createSandbox`.

        Options:

        * `capabilities`: An array of service names that will be supplied when calling
          `createSandbox`
        * `url`: The URL of the JavaScript file that contains the sandbox code

        @param {Object} options
      */
      register: function (options) {
        assert(options.capabilities, "You are trying to register a package without any capabilities. Please provide a list of requested capabilities, or an empty array ([]).");

        this.packages[options.url] = options;
      },

      configure: function(name, value) { this.configuration[name] = value; },
      autoInitializeSandbox: autoInitializeSandbox,

      connect: connect,
      connectCapabilities: connectCapabilities,
      portFor: portFor
    };


    __exports__["default"] = Oasis;
  });
define("oasis/base_adapter", 
  ["rsvp","oasis/logger","oasis/util","oasis/shims","oasis/connect","oasis/message_channel","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __exports__) {
    "use strict";
    var RSVP = __dependency1__;

    var Logger = __dependency2__["default"];
    var mustImplement = __dependency3__.mustImplement;
    var addEventListener = __dependency4__.addEventListener;
    var removeEventListener = __dependency4__.removeEventListener;
    var a_indexOf = __dependency4__.a_indexOf;
    var a_filter = __dependency4__.a_filter;

    var connectCapabilities = __dependency5__.connectCapabilities;
    var PostMessageMessageChannel = __dependency6__.PostMessageMessageChannel;

    function BaseAdapter() {
      this._unsupportedCapabilities = [];
    }

    BaseAdapter.prototype = {
      initializeSandbox: mustImplement('BaseAdapter', 'initializeSandbox'),
      name: mustImplement('BaseAdapter', 'name'),

      unsupportedCapabilities: function () {
        return this._unsupportedCapabilities;
      },

      addUnsupportedCapability: function (capability) {
        this._unsupportedCapabilities.push(capability);
      },

      filterCapabilities: function(capabilities) {
        var unsupported = this._unsupportedCapabilities;
        return a_filter.call(capabilities, function (capability) {
          var index = a_indexOf.call(unsupported, capability);
          return index === -1;
        });
      },

      createChannel: function(oasis) {
        var channel = new PostMessageMessageChannel(oasis);
        channel.port1.start();
        return channel;
      },

      environmentPort: function(sandbox, channel) {
        return channel.port1;
      },

      sandboxPort: function(sandbox, channel) {
        return channel.port2;
      },

      proxyPort: function(sandbox, port) {
        return port;
      },

      connectSandbox: function (receiver, oasis) {
        var adapter = this;

        Logger.log("Sandbox listening for initialization message");

        function initializeOasisSandbox(event) {
          if (!event.data.isOasisInitialization) { return; }

          removeEventListener(receiver, 'message', initializeOasisSandbox);
          adapter.initializeOasisSandbox(event, oasis);
        }
        addEventListener(receiver, 'message', initializeOasisSandbox);

        adapter.oasisLoaded(oasis);
      },

      initializeOasisSandbox: function (event, oasis) {
        var adapter = this;
        oasis.configuration.eventCallback(function () {
          Logger.log("sandbox: received initialization message.");

          oasis.connectCapabilities(event.data.capabilities, event.ports);

          adapter.didConnect(oasis);
        });
      },

      createInitializationMessage: function (sandbox) {
        return {
          isOasisInitialization: true,
          capabilities: sandbox._capabilitiesToConnect,
        };
      },

      oasisLoadedMessage: "oasisSandboxLoaded",
      sandboxInitializedMessage:  "oasisSandboxInitialized"
    };

    __exports__["default"] = BaseAdapter;
  });
define("oasis/config", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
      Stores Oasis configuration.  Options include:

      - `eventCallback` - a function that wraps `message` event handlers.  By
        default the event hanlder is simply invoked.
      - `allowSameOrigin` - a card can be hosted on the same domain
      - `reconnect` - the default reconnect options for iframe sandboxes.  Possible values are:
        - "none" - do not allow sandbox reconnection
        - "verify" - only allow reconnections from the original origin of the sandbox
        - "any" - allow any sandbox reconnections.  Only use this setting if you are
          using Oasis strictly for isolation of trusted applications or if it's safe
          to connect your sandbox to arbitrary origins.  This is an advanced setting
          and should be used with care.
    */
    function OasisConfiguration() {
      this.eventCallback = function (callback) { callback(); };
      this.allowSameOrigin = false;
      this.reconnect = 'verify';
    }

    __exports__["default"] = OasisConfiguration;
  });
define("oasis/connect", 
  ["rsvp","oasis/logger","oasis/util","oasis/shims","oasis/message_channel","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var RSVP = __dependency1__;
    var Logger = __dependency2__["default"];
    var assert = __dependency3__.assert;
    var a_forEach = __dependency4__.a_forEach;

    var PostMessagePort = __dependency5__.PostMessagePort;

    function registerHandler(oasis, capability, options) {
      var port = oasis.ports[capability];

      if (port) {
        Logger.log(oasis.oasisId, "sandbox: found port, setting up '" + capability + "'");
        options.setupCapability(port);

        if (options.promise) {
          options.promise.then(function() {
            port.start();
          }).fail(RSVP.rethrow);
        } else {
          port.start();
        }
      } else if (!oasis.receivedPorts) {
        Logger.log("No port found, saving handler for '" + capability + "'");
        oasis.handlers[capability] = options;
      } else {
        Logger.log("No port was sent for capability '" + capability + "'");
        options.rejectCapability();
      }
    }

    __exports__.registerHandler = registerHandler;/**
      This is the main entry point that allows sandboxes to connect back
      to their containing environment.

      It can be called either with a set of named consumers, with callbacks, or using promises.

      Example

        // Using promises
        Oasis.connect('foo').then( function (port) {
          port.send('hello');
        }, function () {
          // error
        });


        // using callbacks
        Oasis.connect('foo', function (port) {
          port.send('hello');
        }, errorHandler);


        // connecting several consumers at once.
        var ConsumerA = Oasis.Consumer.extend({
          initialize: function (port) { this.port = port; },

          error: function () { }
        });

        var ConsumerB = Oasis.Consumer.extend({
          initialize: function (port) { this.port = port; },

          error: function () { }
        });

        Oasis.connect({
          consumers: {
            capabilityA: ConsumerA,
            capabilityB: ConsumerB
          }
        });

      @param {String} capability the name of the service to connect to, or an object
        containing named consumers to connect.
      @param {Function?} callback the callback to trigger once the other
        side of the connection is available.
      @param {Function?} errorCallback the callback to trigger if the capability is
        not provided by the environment.
      @return {Promise} a promise that will be resolved once the other
        side of the connection is available. You can use this instead
        of the callbacks.
    */
    function connect(capability, callback, errorCallback) {
      if (typeof capability === 'object') {
        return connectConsumers(this, capability.consumers);
      } else if (callback) {
        return connectCallbacks(this, capability, callback, errorCallback);
      } else {
        return connectPromise(this, capability);
      }
    }

    __exports__.connect = connect;function connectCapabilities(capabilities, eventPorts) {
      var oasis = this;
      a_forEach.call(capabilities, function(capability, i) {
        var handler = oasis.handlers[capability],
            port = new PostMessagePort(oasis, eventPorts[i]);

        if (handler) {
          Logger.log("Invoking handler for '" + capability + "'");

          RSVP.resolve(handler.setupCapability(port)).then(function () {
            port.start();
          }).fail(RSVP.rethrow);
        }

        oasis.ports[capability] = port;
      });

      // for each handler w/o capability, reject
      for( var prop in oasis.handlers ) {
        if( ! oasis.ports[prop] ) {
          oasis.handlers[prop].rejectCapability();
        }
      }

      this.receivedPorts = true;
    }

    __exports__.connectCapabilities = connectCapabilities;function portFor(capability) {
      var port = this.ports[capability];
      assert(port, "You asked for the port for the '" + capability + "' capability, but the environment did not provide one.");
      return port;
    }

    __exports__.portFor = portFor;
    function connectConsumers(oasis, consumers) {
      function setupCapability(Consumer, name) {
        return function(port) {
          var consumer = new Consumer(port);
          oasis.consumers[name] = consumer;
          consumer.initialize(port, name);
        };
      }

      function rejectCapability(prop) {
        return function () {
          consumers[prop].prototype.error();
        };
      }

      for (var prop in consumers) {
        registerHandler(oasis, prop, {
          setupCapability: setupCapability(consumers[prop], prop),
          rejectCapability: rejectCapability(prop)
        });
      }
    }

    function connectCallbacks(oasis, capability, callback, errorCallback) {
      Logger.log("Connecting to '" + capability + "' with callback.");

      registerHandler(oasis, capability, {
        setupCapability: function(port) {
          callback(port);
        },
        rejectCapability: function () {
          if (errorCallback) {
            errorCallback();
          }
        }
      });
    }

    function connectPromise(oasis, capability) {
      Logger.log("Connecting to '" + capability + "' with promise.");

      var defered = RSVP.defer();
      registerHandler(oasis, capability, {
        promise: defered.promise,
        setupCapability: function(port) {
          defered.resolve(port);
          return defered.promise;
        },
        rejectCapability: function () {
          defered.reject();
        }
      });
      return defered.promise;
    }
  });
define("oasis/events", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var a_slice = Array.prototype.slice;

    function Events() {
      this.listenerArrays = {};
    }

    Events.prototype = {
      on: function (eventName, listener) {
        var listeners = this.listenerArrays[eventName] = this.listenerArrays[eventName] || [];

        listeners.push(listener);
      },

      off: function (eventName, listener) {
        var listeners = this.listenerArrays[eventName];
        if (!listeners) { return; }

        for (var i=0; i<listeners.length; ++i) {
          if (listeners[i] === listener) {
            listeners.splice(i, 1);
            break;
          }
        }
      },

      clear: function(eventName) {
        delete this.listenerArrays[eventName];
      },

      trigger: function(eventName) {
        var listeners = this.listenerArrays[eventName];
        if (!listeners) { return; }

        var args = a_slice.call(arguments, 1);

        for (var i=0; i<listeners.length; ++i) {
          listeners[i].apply(null, args);
        }
      }
    };

    __exports__["default"] = Events;
  });
define("oasis/iframe_adapter", 
  ["rsvp","oasis/logger","oasis/util","oasis/shims","oasis/base_adapter","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    /*global Window, UUID */

    var RSVP = __dependency1__;
    var Logger = __dependency2__["default"];
    var assert = __dependency3__.assert;
    var extend = __dependency3__.extend;
    var a_forEach = __dependency4__.a_forEach;
    var addEventListener = __dependency4__.addEventListener;
    var removeEventListener = __dependency4__.removeEventListener;
    var a_map = __dependency4__.a_map;

    var BaseAdapter = __dependency5__["default"];

    function verifySandbox(oasis, sandboxUrl) {
      var iframe = document.createElement('iframe'),
          link;

      if( (oasis.configuration.allowSameOrigin && iframe.sandbox !== undefined) ||
          (iframe.sandbox === undefined) ) {
        // The sandbox attribute isn't supported (IE8/9) or we want a child iframe
        // to access resources from its own domain (youtube iframe),
        // we need to make sure the sandbox is loaded from a separate domain
        link = document.createElement('a');
        link.href = sandboxUrl;

        if( !link.host || (link.protocol === window.location.protocol && link.host === window.location.host) ) {
          throw new Error("Security: iFrames from the same host cannot be sandboxed in older browsers and is disallowed.  " +
                          "For HTML5 browsers supporting the `sandbox` attribute on iframes, you can add the `allow-same-origin` flag" +
                          "only if you host the sandbox on a separate domain.");
        }
      }
    }

    function verifyCurrentSandboxOrigin(sandbox, event) {
      var linkOriginal, linkCurrent;

      if (sandbox.firstLoad || sandbox.options.reconnect === "any") {
        return true;
      }

      if (!sandbox.oasis.configuration.allowSameOrigin || event.origin === "null") {
        fail();
      } else {
        linkOriginal = document.createElement('a');
        linkCurrent = document.createElement('a');

        linkOriginal.href = sandbox.options.url;
        linkCurrent.href = event.origin;

        if (linkCurrent.protocol === linkOriginal.protocol &&
            linkCurrent.host === linkOriginal.host) {
          return true;
        }

        fail();
      }

      function fail() {
        sandbox.onerror(
          new Error("Cannot reconnect null origins unless `reconnect` is set to " +
                    "'any'.  `reconnect: 'verify' requires `allowSameOrigin: " +
                    "true`"));
      }
    }

    function isUrl(s) {
      var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
      return regexp.test(s);
    }

    var IframeAdapter = extend(BaseAdapter, {
      //-------------------------------------------------------------------------
      // Environment API

      initializeSandbox: function(sandbox) {
        var options = sandbox.options,
            iframe = document.createElement('iframe'),
            sandboxAttributes = ['allow-scripts'];

        if( sandbox.oasis.configuration.allowSameOrigin ) {
          sandboxAttributes.push('allow-same-origin');
        }
        if( options && options.sandbox && options.sandbox.popups ) {
          sandboxAttributes.push('allow-popups');
        }

        iframe.name = sandbox.options.url + '?uuid=' + UUID.generate();
        iframe.sandbox = sandboxAttributes.join(' ');
        iframe.seamless = true;

        // rendering-specific code
        if (options.width) {
          iframe.width = options.width;
        } else if (options.height) {
          iframe.height = options.height;
        }

        // Error handling inside the iFrame
        iframe.errorHandler = function(event) {
          if(!event.data.sandboxException) {return;}
          try {
            // verify this message came from the expected sandbox; try/catch
            // because ie8 will disallow reading contentWindow in the case of
            // another sandbox's message
            if( event.source !== iframe.contentWindow ) {return;}
          } catch(e) {
            return;
          }

          sandbox.onerror( event.data.sandboxException );
        };
        addEventListener(window, 'message', iframe.errorHandler);

        verifySandbox( sandbox.oasis, sandbox.options.url );
        iframe.src = sandbox.options.url;

        Logger.log('Initializing sandbox ' + iframe.name);

        // Promise that sandbox has loaded and capabilities connected at least once.
        // This does not mean that the sandbox will be loaded & connected in the
        // face of reconnects (eg pages that navigate)
        sandbox._waitForLoadDeferred().resolve(new RSVP.Promise( function(resolve, reject) {
          iframe.initializationHandler = function (event) {
            if( event.data !== sandbox.adapter.sandboxInitializedMessage ) {return;}
            try {
              // verify this message came from the expected sandbox; try/catch
              // because ie8 will disallow reading contentWindow in the case of
              // another sandbox's message
              if( event.source !== iframe.contentWindow ) {return;}
            } catch(e) {
              return;
            }
            removeEventListener(window, 'message', iframe.initializationHandler);

            sandbox.oasis.configuration.eventCallback(function () {
              Logger.log("container: iframe sandbox has initialized (capabilities connected)");
              resolve(sandbox);
            });
          };
          addEventListener(window, 'message', iframe.initializationHandler);
        }));

        sandbox.el = iframe;

        iframe.oasisLoadHandler = function (event) {
          if( event.data !== sandbox.adapter.oasisLoadedMessage ) {return;}
          try {
            // verify this message came from the expected sandbox; try/catch
            // because ie8 will disallow reading contentWindow in the case of
            // another sandbox's message
            if( event.source !== iframe.contentWindow ) {return;}
          } catch(e) {
            return;
          }

          Logger.log("container: iframe sandbox has loaded Oasis");


          if (verifyCurrentSandboxOrigin(sandbox, event)) {
            sandbox.createAndTransferCapabilities();
          }

          if (sandbox.options.reconnect === "none") {
            removeEventListener(window, 'message', iframe.oasisLoadHandler);
          }
        };
        addEventListener(window, 'message', iframe.oasisLoadHandler);
      },

      startSandbox: function(sandbox) {
        var head = document.head || document.documentElement.getElementsByTagName('head')[0];
        head.appendChild(sandbox.el);
      },

      terminateSandbox: function(sandbox) {
        var el = sandbox.el;

        sandbox.terminated = true;

        if (el.loadHandler) {
          // no load handler for HTML sandboxes
          removeEventListener(el, 'load', el.loadHandler);
        }
        removeEventListener(window, 'message', el.initializationHandler);
        removeEventListener(window, 'message', el.oasisLoadHandler);

        if (el.parentNode) {
          Logger.log("Terminating sandbox ", sandbox.el.name);
          el.parentNode.removeChild(el);
        }

        sandbox.el = null;
      },

      connectPorts: function(sandbox, ports) {
        var rawPorts = a_map.call(ports, function(port) { return port.port; }),
            message = this.createInitializationMessage(sandbox);

        if (sandbox.terminated) { return; }
        Window.postMessage(sandbox.el.contentWindow, message, '*', rawPorts);
      },

      //-------------------------------------------------------------------------
      // Sandbox API

      connectSandbox: function(oasis) {
        return BaseAdapter.prototype.connectSandbox.call(this, window, oasis);
      },

      oasisLoaded: function() {
        window.parent.postMessage(this.oasisLoadedMessage, '*', []);
      },

      didConnect: function() {
        window.parent.postMessage(this.sandboxInitializedMessage, '*', []);
      },

      name: function(sandbox) {
        return sandbox.el.name;
      }

    });

    __exports__["default"] = IframeAdapter;
  });
define("oasis/inline_adapter", 
  ["rsvp","oasis/logger","oasis/util","oasis/config","oasis/shims","oasis/xhr","oasis/base_adapter","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __exports__) {
    "use strict";
    /*global self, postMessage, importScripts */

    var RSVP = __dependency1__;
    var Logger = __dependency2__["default"];
    var assert = __dependency3__.assert;
    var extend = __dependency3__.extend;
    var noop = __dependency3__.noop;
    var configuration = __dependency4__.configuration;
    var a_forEach = __dependency5__.a_forEach;
    var a_map = __dependency5__.a_map;
    var xhr = __dependency6__.xhr;

    var BaseAdapter = __dependency7__["default"];

    var InlineAdapter = extend(BaseAdapter, {
      //-------------------------------------------------------------------------
      // Environment API

      initializeSandbox: function(sandbox) {
        sandbox.el = document.createElement('div');

        var oasis = sandbox.sandboxedOasis = new Oasis();
        sandbox.sandboxedOasis.sandbox = sandbox;
        // When we upgrade RSVP we can change this to `RSVP.async`
        RSVP.resolve().then(function () {
          sandbox.createAndTransferCapabilities();
        });
      },
     
      startSandbox: function(sandbox) {
        var body = document.body || document.documentElement.getElementsByTagName('body')[0];
        body.appendChild(sandbox.el);
      },

      terminateSandbox: function(sandbox) {
        var el = sandbox.el;

        if (el.parentNode) {
          Logger.log("Terminating sandbox ", sandbox.el.name);
          el.parentNode.removeChild(el);
        }

        sandbox.el = null;
      },

      connectPorts: function(sandbox, ports) {
        var rawPorts = a_map.call(ports, function(oasisPort){ return oasisPort.port; }),
            message = this.createInitializationMessage(sandbox),
            event = { data: message, ports: rawPorts };

        // Normally `connectSandbox` is called in autoinitialization, but there
        // isn't a real sandbox here.
        this.connectSandbox(sandbox.sandboxedOasis, event);
      },

      fetchResource: function (url, oasis) {
        var adapter = this;

        return xhr(url, {
          dataType: 'text'
        }, oasis).then(function (code) {
          return adapter.wrapResource(code);
        }).fail(RSVP.rethrow);
      },

      wrapResource: function (code) {
        return new Function("oasis", code);
      },

      //-------------------------------------------------------------------------
      // Sandbox API

      connectSandbox: function(oasis, pseudoEvent) {
        return this.initializeOasisSandbox(pseudoEvent, oasis);
      },

      oasisLoaded: noop,

      didConnect: function(oasis) {
        var adapter = this;

        return oasis.sandbox._waitForLoadDeferred().resolve(loadSandboxJS().fail(RSVP.rethrow));

        function applySandboxJS(sandboxFn) {
          Logger.log("sandbox: inline sandbox initialized");
          sandboxFn(oasis);
          return oasis.sandbox;
        }

        function loadSandboxJS() {
          return new RSVP.Promise(function (resolve, reject) {
            resolve(adapter.fetchResource(oasis.sandbox.options.url, oasis).
              then(applySandboxJS));
          });
        }
      },
    });

    __exports__["default"] = InlineAdapter;
  });
define("oasis/logger", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function Logger() {
      this.enabled = false;
    }

    Logger.prototype = {
      enable: function () {
        this.enabled = true;
      },

      disable: function () {
        this.enabled = false;
      },

      log: function () {
        if (logger.enabled) {
          if (typeof console !== 'undefined' && typeof console.log === 'function') {
            console.log.apply(console, arguments);
          } else if (typeof console !== 'undefined' && typeof console.log === 'object') {
            // Log in IE
            try {
              switch (arguments.length) {
                case 1:
                  console.log(arguments[0]);
                  break;
                case 2:
                  console.log(arguments[0], arguments[1]);
                  break;
                default:
                  console.log(arguments[0], arguments[1], arguments[2]);
              }
            } catch(e) {}
          }
        }
      }
    };

    var logger = new Logger();

    __exports__["default"] = logger;
  });
define("oasis/message_channel", 
  ["rsvp","oasis/util","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var RSVP = __dependency1__;
    var extend = __dependency2__.extend;
    var mustImplement = __dependency2__.mustImplement;

    /**
      OasisPort is an interface that adapters can use to implement ports.
      Ports are passed into the `initialize` method of services and consumers,
      and are available as `this.port` on services and consumers.

      Ports are the low-level API that can be used to communicate with the
      other side of a connection. In general, you will probably want to use
      the `events` and `requests` objects inside your service or consumer
      rather than manually listen for events and requests.

      @constructor
      @param {OasisPort} oasis
      @param {OasisPort} port
    */
    function OasisPort(oasis, port) {}

    __exports__.OasisPort = OasisPort;
    function getRequestId(oasis) {
      return oasis.oasisId + '-' + oasis.requestId++;
    }

    OasisPort.prototype = {
      /**
        This allows you to register an event handler for a particular event
        name.

        @param {String} eventName the name of the event
        @param {Function} callback the callback to call when the event occurs
        @param {any?} binding an optional value of `this` inside of the callback
      */
      on: mustImplement('OasisPort', 'on'),

      /**
        Allows you to register an event handler that is called for all events
        that are sent to the port.
      */
      all: mustImplement('OasisPort', 'all'),

      /**
        This allows you to unregister an event handler for an event name
        and callback. You should not pass in the optional binding.

        @param {String} eventName the name of the event
        @param {Function} callback a reference to the callback that was
          passed into `.on`.
      */
      off: mustImplement('OasisPort', 'off'),

      /**
        This method sends an event to the other side of the connection.

        @param {String} eventName the name of the event
        @param {Structured?} data optional data to pass along with the event
      */
      send: mustImplement('OasisPort', 'send'),

      /**
        @private

        Adapters should implement this to start receiving messages from the
        other side of the connection.

        It is up to the adapter to make sure that no messages are dropped if
        they are sent before `start` is called.
      */
      start: mustImplement('OasisPort', 'start'),

      /**
        @private

        Adapters should implement this to stop receiving messages from the
        other side of the connection.
      */
      close: mustImplement('OasisPort', 'close'),

      /**
        This method sends a request to the other side of the connection.

        @param {String} requestName the name of the request
        @return {Promise} a promise that will be resolved with the value
          provided by the other side of the connection, or rejected if the other
          side indicates retrieving the value resulted in an error. The fulfillment
          value must be structured data.
      */
      request: function(eventName) {
        var oasis = this.oasis;
        var port = this;
        var args = [].slice.call(arguments, 1);

        return new RSVP.Promise(function (resolve, reject) {
          var requestId = getRequestId(oasis);

          var clearObservers = function () {
            port.off('@response:' + eventName, observer);
            port.off('@errorResponse:' + eventName, errorObserver);
          };

          var observer = function(event) {
            if (event.requestId === requestId) {
              clearObservers();
              resolve(event.data);
            }
          };

          var errorObserver = function (event) {
            if (event.requestId === requestId) {
              clearObservers();
              reject(event.data);
            }
          };

          port.on('@response:' + eventName, observer, port);
          port.on('@errorResponse:' + eventName, errorObserver, port);
          port.send('@request:' + eventName, { requestId: requestId, args: args });
        });
      },

      /**
        This method registers a callback to be called when a request is made
        by the other side of the connection.

        The callback will be called with any arguments passed in the request.  It
        may either return a value directly, or return a promise if the value must be
        retrieved asynchronously.

        Examples:

          // This completes the request immediately.
          service.onRequest('name', function () {
            return 'David';
          });


          // This completely the request asynchronously.
          service.onRequest('name', function () {
            return new Oasis.RSVP.Promise(function (resolve, reject) {
              setTimeout( function() {
                resolve('David');
              }, 200);
            });
          });

        @param {String} requestName the name of the request
        @param {Function} callback the callback to be called when a request
          is made.
        @param {any?} binding the value of `this` in the callback
      */
      onRequest: function(eventName, callback, binding) {
        var self = this;

        this.on('@request:' + eventName, function(data) {
          var requestId = data.requestId,
              args = data.args,
              getResponse = new RSVP.Promise(function (resolve, reject) {
                var value = callback.apply(binding, data.args);
                if (undefined !== value) {
                  resolve(value);
                } else {
                  reject("@request:" + eventName + " [" + data.requestId + "] did not return a value.  If you want to return a literal `undefined` return `RSVP.resolve(undefined)`");
                }
              });

          getResponse.then(function (value) {
            self.send('@response:' + eventName, {
              requestId: requestId,
              data: value
            });
          }, function (error) {
            var value = error;
            if (error instanceof Error) {
              value = {
                message: error.message,
                stack: error.stack
              };
            }
            self.send('@errorResponse:' + eventName, {
              requestId: requestId,
              data: value
            });
          });
        });
      }
    };


    function OasisMessageChannel(oasis) {}

    OasisMessageChannel.prototype = {
      start: mustImplement('OasisMessageChannel', 'start')
    };


    var PostMessageMessageChannel = extend(OasisMessageChannel, {
      initialize: function(oasis) {
        this.channel = new MessageChannel();
        this.port1 = new PostMessagePort(oasis, this.channel.port1);
        this.port2 = new PostMessagePort(oasis, this.channel.port2);
      },

      start: function() {
        this.port1.start();
        this.port2.start();
      },

      destroy: function() {
        this.port1.close();
        this.port2.close();
        delete this.port1;
        delete this.port2;
        delete this.channel;
      }
    });
    __exports__.PostMessageMessageChannel = PostMessageMessageChannel;
    var PostMessagePort = extend(OasisPort, {
      initialize: function(oasis, port) {
        this.oasis = oasis;
        this.port = port;
        this._callbacks = [];
      },

      on: function(eventName, callback, binding) {
        var oasis = this.oasis;

        function wrappedCallback(event) {
          if (event.data.type === eventName) {
            oasis.configuration.eventCallback(function () {
              return callback.call(binding, event.data.data);
            });
          }
        }

        this._callbacks.push([callback, wrappedCallback]);
        this.port.addEventListener('message', wrappedCallback);
      },

      all: function(callback, binding) {
        var oasis = this.oasis;

        function wrappedCallback(event) {
          oasis.configuration.eventCallback(function () {
            callback.call(binding, event.data.type, event.data.data);
          });
        }

        this.port.addEventListener('message', wrappedCallback);
      },

      off: function(eventName, callback) {
        var foundCallback;

        for (var i=0, l=this._callbacks.length; i<l; i++) {
          foundCallback = this._callbacks[i];
          if (foundCallback[0] === callback) {
            this.port.removeEventListener('message', foundCallback[1]);
          }
        }
      },

      send: function(eventName, data) {
        this.port.postMessage({
          type: eventName,
          data: data
        });
      },

      start: function() {
        this.port.start();
      },

      close: function() {
        var foundCallback;

        for (var i=0, l=this._callbacks.length; i<l; i++) {
          foundCallback = this._callbacks[i];
          this.port.removeEventListener('message', foundCallback[1]);
        }
        this._callbacks = [];

        this.port.close();
      }
    });
    __exports__.PostMessagePort = PostMessagePort;
  });
define("oasis/sandbox", 
  ["rsvp","oasis/logger","oasis/util","oasis/shims","oasis/message_channel","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var RSVP = __dependency1__;
    var Logger = __dependency2__["default"];
    var assert = __dependency3__.assert;
    var uniq = __dependency3__.uniq;
    var reverseMerge = __dependency3__.reverseMerge;
    var a_forEach = __dependency4__.a_forEach;
    var a_reduce = __dependency4__.a_reduce;
    var a_filter = __dependency4__.a_filter;

    var OasisPort = __dependency5__.OasisPort;

    var OasisSandbox = function(oasis, options) {
      options = reverseMerge(options || {}, {
        reconnect: oasis.configuration.reconnect
      });

      var reconnect = options.reconnect;
      assert( reconnect === "none" || reconnect === "verify" || reconnect === "any",
              "`reconnect` must be one of 'none', 'verify' or 'any'.  '" + reconnect + "' is invalid.");

      this.connections = {};
      this.wiretaps = [];

      this.oasis = oasis;

      // Generic capabilities code
      var pkg = oasis.packages[options.url];

      var capabilities = options.capabilities;
      if (!capabilities) {
        assert(pkg, "You are trying to create a sandbox from an unregistered URL without providing capabilities. Please use Oasis.register to register your package or pass a list of capabilities to createSandbox.");
        capabilities = pkg.capabilities;
      }

      pkg = pkg || {};

      this.adapter = options.adapter || Oasis.adapters.iframe;

      this._capabilitiesToConnect = this._filterCapabilities(capabilities);
      this.envPortDefereds = {};
      this.sandboxPortDefereds = {};
      this.channels = {};
      this.capabilities = {};
      this.options = options;
      this.firstLoad = true;

      var sandbox = this;
      this.promisePorts();
      this.adapter.initializeSandbox(this);
    };

    OasisSandbox.prototype = {
      waitForLoad: function () {
        return this._waitForLoadDeferred().promise;
      },

      wiretap: function(callback) {
        this.wiretaps.push(callback);
      },

      connect: function(capability) {
        var portPromise = this.envPortDefereds[capability].promise;

        assert(portPromise, "Connect was called on '" + capability + "' but no such capability was registered.");

        return portPromise;
      },

      createAndTransferCapabilities: function () {
        if (!this.firstLoad) { this.promisePorts(); }

        this.createChannels();
        this.connectPorts();

        // subsequent calls to `createAndTransferCapabilities` requires new port promises
        this.firstLoad = false;
      },

      promisePorts: function () {
        a_forEach.call(this._capabilitiesToConnect, function(capability) {
          this.envPortDefereds[capability] = RSVP.defer();
          this.sandboxPortDefereds[capability] = RSVP.defer();
        }, this);
      },

      createChannels: function () {
        var sandbox = this,
            services = this.options.services || {},
            channels = this.channels;
        a_forEach.call(this._capabilitiesToConnect, function (capability) {

          Logger.log("container: Will create port for '" + capability + "'");
          var service = services[capability],
              channel, port;

          // If an existing port is provided, just
          // pass it along to the new sandbox.

          // TODO: This should probably be an OasisPort if possible
          if (service instanceof OasisPort) {
            port = this.adapter.proxyPort(this, service);
            this.capabilities[capability] = service;
          } else {
            channel = channels[capability] = this.adapter.createChannel(sandbox.oasis);

            var environmentPort = this.adapter.environmentPort(this, channel),
                sandboxPort = this.adapter.sandboxPort(this, channel);

            Logger.log("container: Wiretapping '" + capability + "'");

            environmentPort.all(function(eventName, data) {
              a_forEach.call(this.wiretaps, function(wiretap) {
                wiretap(capability, {
                  type: eventName,
                  data: data,
                  direction: 'received'
                });
              });
            }, this);

            a_forEach.call(this.wiretaps, function(wiretap) {
              var originalSend = environmentPort.send;

              environmentPort.send = function(eventName, data) {
                wiretap(capability, {
                  type: eventName,
                  data: data,
                  direction: 'sent'
                });

                originalSend.apply(environmentPort, arguments);
              };
            });

            if (service) {
              Logger.log("container: Creating service for '" + capability + "'");
              /*jshint newcap:false*/
              // Generic
              service = new service(environmentPort, this);
              service.initialize(environmentPort, capability);
              sandbox.oasis.services.push(service);
              this.capabilities[capability] = service;
            }

            // Law of Demeter violation
            port = sandboxPort;

            this.envPortDefereds[capability].resolve(environmentPort);
          }

          Logger.log("container: Port created for '" + capability + "'");
          this.sandboxPortDefereds[capability].resolve(port);
        }, this);
      },

      destroyChannels: function() {
        for( var prop in this.channels ) {
          this.channels[prop].destroy();
          delete this.channels[prop];
        }
        this.channels = [];
      },

      connectPorts: function () {
        var sandbox = this;

        var allSandboxPortPromises = a_reduce.call(this._capabilitiesToConnect, function (accumulator, capability) {
          return accumulator.concat(sandbox.sandboxPortDefereds[capability].promise);
        }, []);

        RSVP.all(allSandboxPortPromises).then(function (ports) {
          Logger.log("container: All " + ports.length + " ports created.  Transferring them.");
          sandbox.adapter.connectPorts(sandbox, ports);
        }).fail(RSVP.rethrow);
      },

      start: function(options) {
        this.adapter.startSandbox(this, options);
      },

      terminate: function() {
        var sandbox = this,
            channel,
            environmentPort;

        if( this.isTerminated ) { return; }
        this.isTerminated = true;

        this.adapter.terminateSandbox(this);

        this.destroyChannels();

        for( var index=0 ; index<sandbox.oasis.services.length ; index++) {
          sandbox.oasis.services[index].destroy();
          delete sandbox.oasis.services[index];
        }
        sandbox.oasis.services = [];
      },

      onerror: function(error) {
        throw error;
      },

      name: function() {
        return this.adapter.name(this);
      },

      // Oasis internal

      _filterCapabilities: function(capabilities) {
        return uniq.call(this.adapter.filterCapabilities(capabilities));
      },

      _waitForLoadDeferred: function () {
        if (!this._loadDeferred) {
          // the adapter will resolve this
          this._loadDeferred = RSVP.defer();
        }

        return this._loadDeferred;
      }
    };

    __exports__["default"] = OasisSandbox;
  });
define("oasis/sandbox_init", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function autoInitializeSandbox () {
      if (typeof window !== 'undefined') {
        if (/PhantomJS/.test(navigator.userAgent)) {
          // We don't support phantomjs for several reasons, including
          //  - window.constructor vs Window
          //  - postMessage must not have ports (but recall in IE postMessage must
          //    have ports)
          //  - because of the above we need to polyfill, but we fail to do so
          //    because we see MessageChannel in global object
          //  - we erroneously try to decode the oasis load message; alternatively
          //    we should just encode the init message
          //  - all the things we haven't noticed yet
          return;
        }

        if (window.parent && window.parent !== window) {
          Oasis.adapters.iframe.connectSandbox(this);
        } 
      } else {
        Oasis.adapters.webworker.connectSandbox(this);
      }
    }

    __exports__["default"] = autoInitializeSandbox;
  });
define("oasis/service", 
  ["oasis/shims","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var o_create = __dependency1__.o_create;

    /**
      This is a base class that services and consumers can subclass to easily
      implement a number of events and requests at once.

      Example:

          var MetadataService = Oasis.Service.extend({
            initialize: function() {
              this.send('data', this.sandbox.data);
            },

            events: {
              changed: function(data) {
                this.sandbox.data = data;
              }
            },

            requests: {
              valueForProperty: function(name, promise) {
                promise.resolve(this.sandbox.data[name]);
              }
            }
          });

      In the above example, the metadata service implements the Service
      API using `initialize`, `events` and `requests`.

      Both services (implemented in the containing environment) and
      consumers (implemented in the sandbox) use the same API for
      registering events and requests.

      In the containing environment, a service is registered in the
      `createSandbox` method. In the sandbox, a consumer is registered
      using `Oasis.connect`.

      ### `initialize`

      Oasis calls the `initialize` method once the other side of the
      connection has initialized the connection.

      This method is useful to pass initial data back to the other side
      of the connection. You can also set up events or requests manually,
      but you will usually want to use the `events` and `requests` sections
      for events and requests.

      ### `events`

      The `events` object is a list of event names and associated callbacks.
      Oasis will automatically set up listeners for each named event, and
      trigger the callback with the data provided by the other side of the
      connection.

      ### `requests`

      The `requests` object is a list of request names and associated
      callbacks. Oasis will automatically set up listeners for requests
      made by the other side of the connection, and trigger the callback
      with the request information as well as a promise that you should
      use to fulfill the request.

      Once you have the information requested, you should call
      `promise.resolve` with the response data.

      @constructor
      @param {OasisPort} port
      @param {OasisSandbox} sandbox in the containing environment, the
        OasisSandbox that this service is connected to.
    */
    function Service (port, sandbox) {
      var service = this, prop, callback;

      this.sandbox = sandbox;
      this.port = port;

      function xform(callback) {
        return function() {
          return callback.apply(service, arguments);
        };
      }

      for (prop in this.events) {
        callback = this.events[prop];
        port.on(prop, xform(callback));
      }

      for (prop in this.requests) {
        callback = this.requests[prop];
        port.onRequest(prop, xform(callback));
      }
    }

    Service.prototype = {
      /**
        This hook is called when the connection is established. When
        `initialize` is called, it is safe to register listeners and
        send data to the other side.

        The implementation of Oasis makes it impossible for messages
        to get dropped on the floor due to timing issues.

        @param {OasisPort} port the port to the other side of the connection
        @param {String} name the name of the service
      */
      initialize: function() {},


      /**
        This hooks is called when an attempt is made to connect to a capability the
        environment does not provide.
      */
      error: function() {},

      /**
        This hook is called when the connection is stopped. When
        `destroy` is called, it is safe to unregister listeners.
      */
      destroy: function() {},

      /**
        This method can be used to send events to the other side of the
        connection.

        @param {String} eventName the name of the event to send to the
          other side of the connection
        @param {Structured} data an additional piece of data to include
          as the data for the event.
      */
      send: function() {
        return this.port.send.apply(this.port, arguments);
      },

      /**
        This method can be used to request data from the other side of
        the connection.

        @param {String} requestName the name of the request to send to
          the other side of the connection.
        @return {Promise} a promise that will be resolved by the other
          side of the connection. Use `.then` to wait for the resolution.
      */
      request: function() {
        return this.port.request.apply(this.port, arguments);
      }
    };

    Service.extend = function extend(object) {
      var superConstructor = this;

      function Service() {
        if (Service.prototype.init) { Service.prototype.init.call(this); }
        superConstructor.apply(this, arguments);
      }

      Service.extend = extend;

      var ServiceProto = Service.prototype = o_create(this.prototype);

      for (var prop in object) {
        ServiceProto[prop] = object[prop];
      }

      return Service;
    };

    __exports__["default"] = Service;
  });
define("oasis/shims", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var K = function() {};

    function o_create(obj, props) {
      K.prototype = obj;
      obj = new K();
      if (props) {
        K.prototype = obj;
        for (var prop in props) {
          K.prototype[prop] = props[prop].value;
        }
        obj = new K();
      }
      K.prototype = null;

      return obj;
    }

    __exports__.o_create = o_create;// If it turns out we need a better polyfill we can grab mozilla's at: 
    // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget.removeEventListener?redirectlocale=en-US&redirectslug=DOM%2FEventTarget.removeEventListener#Polyfill_to_support_older_browsers
    function addEventListener(receiver, eventName, fn) {
      if (receiver.addEventListener) {
        return receiver.addEventListener(eventName, fn);
      } else if (receiver.attachEvent) {
        return receiver.attachEvent('on' + eventName, fn);
      }
    }

    __exports__.addEventListener = addEventListener;function removeEventListener(receiver, eventName, fn) {
      if (receiver.removeEventListener) {
        return receiver.removeEventListener(eventName, fn);
      } else if (receiver.detachEvent) {
        return receiver.detachEvent('on' + eventName, fn);
      }
    }

    __exports__.removeEventListener = removeEventListener;function isNativeFunc(func) {
      // This should probably work in all browsers likely to have ES5 array methods
      return func && Function.prototype.toString.call(func).indexOf('[native code]') > -1;
    }

    var a_forEach = isNativeFunc(Array.prototype.forEach) ? Array.prototype.forEach : function(fun /*, thisp */) {
      if (this === void 0 || this === null) {
        throw new TypeError();
      }

      var t = Object(this);
      var len = t.length >>> 0;
      if (typeof fun !== "function") {
        throw new TypeError();
      }

      var thisp = arguments[1];
      for (var i = 0; i < len; i++) {
        if (i in t) {
          fun.call(thisp, t[i], i, t);
        }
      }
    };
    __exports__.a_forEach = a_forEach;
    var a_reduce = isNativeFunc(Array.prototype.reduce) ? Array.prototype.reduce : function(callback, opt_initialValue){
      if (null === this || 'undefined' === typeof this) {
        // At the moment all modern browsers, that support strict mode, have
        // native implementation of Array.prototype.reduce. For instance, IE8
        // does not support strict mode, so this check is actually useless.
        throw new TypeError(
            'Array.prototype.reduce called on null or undefined');
      }
      if ('function' !== typeof callback) {
        throw new TypeError(callback + ' is not a function');
      }
      var index = 0, length = this.length >>> 0, value, isValueSet = false;
      if (1 < arguments.length) {
        value = opt_initialValue;
        isValueSet = true;
      }
      for ( ; length > index; ++index) {
        if (!this.hasOwnProperty(index)) continue;
        if (isValueSet) {
          value = callback(value, this[index], index, this);
        } else {
          value = this[index];
          isValueSet = true;
        }
      }
      if (!isValueSet) {
        throw new TypeError('Reduce of empty array with no initial value');
      }
      return value;
    };
    __exports__.a_reduce = a_reduce;
    var a_map = isNativeFunc(Array.prototype.map) ? Array.prototype.map : function(callback, thisArg) {

        var T, A, k;

        if (this == null) {
          throw new TypeError(" this is null or not defined");
        }

        // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
        var O = Object(this);

        // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
        // 3. Let len be ToUint32(lenValue).
        var len = O.length >>> 0;

        // 4. If IsCallable(callback) is false, throw a TypeError exception.
        // See: http://es5.github.com/#x9.11
        if (typeof callback !== "function") {
          throw new TypeError(callback + " is not a function");
        }

        // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
        if (thisArg) {
          T = thisArg;
        }

        // 6. Let A be a new array created as if by the expression new Array(len) where Array is
        // the standard built-in constructor with that name and len is the value of len.
        A = new Array(len);

        // 7. Let k be 0
        k = 0;

        // 8. Repeat, while k < len
        while(k < len) {

          var kValue, mappedValue;

          // a. Let Pk be ToString(k).
          //   This is implicit for LHS operands of the in operator
          // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
          //   This step can be combined with c
          // c. If kPresent is true, then
          if (k in O) {

            // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
            kValue = O[ k ];

            // ii. Let mappedValue be the result of calling the Call internal method of callback
            // with T as the this value and argument list containing kValue, k, and O.
            mappedValue = callback.call(T, kValue, k, O);

            // iii. Call the DefineOwnProperty internal method of A with arguments
            // Pk, Property Descriptor {Value: mappedValue, : true, Enumerable: true, Configurable: true},
            // and false.

            // In browsers that support Object.defineProperty, use the following:
            // Object.defineProperty(A, Pk, { value: mappedValue, writable: true, enumerable: true, configurable: true });

            // For best browser support, use the following:
            A[ k ] = mappedValue;
          }
          // d. Increase k by 1.
          k++;
        }

        // 9. return A
        return A;
      };
    __exports__.a_map = a_map; 

    var a_indexOf = isNativeFunc(Array.prototype.indexOf) ? Array.prototype.indexOf : function (searchElement /*, fromIndex */ ) {
      /* jshint eqeqeq:false */
      "use strict";
      if (this == null) {
        throw new TypeError();
      }
      var t = Object(this);
      var len = t.length >>> 0;

      if (len === 0) {
        return -1;
      }
      var n = 0;
      if (arguments.length > 1) {
        n = Number(arguments[1]);
        if (n != n) { // shortcut for verifying if it's NaN
          n = 0;
        } else if (n != 0 && n != Infinity && n != -Infinity) {
          n = (n > 0 || -1) * Math.floor(Math.abs(n));
        }
      }
      if (n >= len) {
        return -1;
      }
      var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
      for (; k < len; k++) {
        if (k in t && t[k] === searchElement) {
          return k;
        }
      }
      return -1;
    };
    __exports__.a_indexOf = a_indexOf;
    var a_filter = isNativeFunc(Array.prototype.filter) ? Array.prototype.filter : function(fun /*, thisp*/) {
      'use strict';

      if (!this) {
        throw new TypeError();
      }

      var objects = Object(this);
      var len = objects.length >>> 0;
      if (typeof fun !== 'function') {
        throw new TypeError();
      }

      var res = [];
      var thisp = arguments[1];
      for (var i in objects) {
        if (objects.hasOwnProperty(i)) {
          if (fun.call(thisp, objects[i], i, objects)) {
            res.push(objects[i]);
          }
        }
      }

      return res;
    };
    __exports__.a_filter = a_filter;
  });
define("oasis/util", 
  ["oasis/shims","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var o_create = __dependency1__.o_create;
    var a_filter = __dependency1__.a_filter;

    function assert(assertion, string) {
      if (!assertion) {
        throw new Error(string);
      }
    }

    __exports__.assert = assert;function noop() { }

    __exports__.noop = noop;function mustImplement(className, name) {
      return function() {
        throw new Error("Subclasses of " + className + " must implement " + name);
      };
    }

    __exports__.mustImplement = mustImplement;function extend(parent, object) {
      function OasisObject() {
        parent.apply(this, arguments);
        if (this.initialize) {
          this.initialize.apply(this, arguments);
        }
      }

      OasisObject.prototype = o_create(parent.prototype);

      for (var prop in object) {
        if (!object.hasOwnProperty(prop)) { continue; }
        OasisObject.prototype[prop] = object[prop];
      }

      return OasisObject;
    }

    __exports__.extend = extend;function delegate(delegateeProperty, delegatedMethod) {
      return function () {
        var delegatee = this[delegateeProperty];
        return delegatee[delegatedMethod].apply(delegatee, arguments);
      };
    }

    __exports__.delegate = delegate;function uniq() {
      var seen = {};
      return a_filter.call(this, function (item) {
        var _seen = !seen.hasOwnProperty(item);
        seen[item] = true;
        return _seen;
      });
    }

    __exports__.uniq = uniq;function reverseMerge(a, b) {
      for (var prop in b) {
        if (!b.hasOwnProperty(prop)) { continue; }

        if (! (prop in a)) {
          a[prop] = b[prop];
        }
      }

      return a;
    }

    __exports__.reverseMerge = reverseMerge;
  });
define("oasis/version", 
  ["exports"],
  function(__exports__) {
    "use strict";
    __exports__["default"] = '0.4.0';
  });
define("oasis/webworker_adapter", 
  ["rsvp","oasis/logger","oasis/util","oasis/shims","oasis/base_adapter","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    /*global self, postMessage, importScripts, UUID */

    var RSVP = __dependency1__;
    var Logger = __dependency2__["default"];
    var assert = __dependency3__.assert;
    var extend = __dependency3__.extend;
    var a_forEach = __dependency4__.a_forEach;
    var addEventListener = __dependency4__.addEventListener;
    var removeEventListener = __dependency4__.removeEventListener;

    var BaseAdapter = __dependency5__["default"];

    var WebworkerAdapter = extend(BaseAdapter, {
      type: 'js',

      //-------------------------------------------------------------------------
      // Environment API

      initializeSandbox: function(sandbox) {
        var worker = new Worker(sandbox.options.url);
        worker.name = sandbox.options.url + '?uuid=' + UUID.generate();
        sandbox.worker = worker;

        // Error handling inside the worker
        worker.errorHandler = function(event) {
          if(!event.data.sandboxException) {return;}

          sandbox.onerror( event.data.sandboxException );
        };
        addEventListener(worker, 'message', worker.errorHandler);

        sandbox._waitForLoadDeferred().resolve(new RSVP.Promise( function(resolve, reject) {
          worker.initializationHandler = function (event) {
            sandbox.oasis.configuration.eventCallback(function () {
              if( event.data !== sandbox.adapter.sandboxInitializedMessage ) {return;}
              removeEventListener(worker, 'message', worker.initializationHandler);

              Logger.log("worker sandbox initialized");
              resolve(sandbox);
            });
          };
          addEventListener(worker, 'message', worker.initializationHandler);
        }));

        worker.loadHandler = function (event) {
          sandbox.oasis.configuration.eventCallback(function () {
            if( event.data !== sandbox.adapter.oasisLoadedMessage ) {return;}
            removeEventListener(worker, 'message', worker.loadHandler);

            Logger.log("worker sandbox initialized");
            sandbox.createAndTransferCapabilities();
          });
        };
        addEventListener(worker, 'message', worker.loadHandler);
      },

      startSandbox: function(sandbox) { },

      terminateSandbox: function(sandbox) {
        var worker = sandbox.worker;

        removeEventListener(worker, 'message', worker.loadHandler);
        removeEventListener(worker, 'message', worker.initializationHandler);
        sandbox.worker.terminate();
      },

      connectPorts: function(sandbox, ports) {
        var rawPorts = ports.map(function(port) { return port.port; }),
            message = this.createInitializationMessage(sandbox);

        Worker.postMessage(sandbox.worker, message, rawPorts);
      },

      connectSandbox: function(oasis) {
        return BaseAdapter.prototype.connectSandbox.call(this, self, oasis);
      },

      //-------------------------------------------------------------------------
      // Sandbox API

      name: function(sandbox) {
        return sandbox.worker.name;
      },

      oasisLoaded: function() {
        postMessage(this.oasisLoadedMessage, []);
      },

      didConnect: function() {
        postMessage(this.sandboxInitializedMessage, []);
      }
    });

    __exports__["default"] = WebworkerAdapter;
  });
define("oasis/xhr", 
  ["rsvp","oasis/util","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    /*global XDomainRequest */

    var RSVP = __dependency1__;
    var noop = __dependency2__.noop;

    var a_slice = Array.prototype.slice;

    function acceptsHeader(options) {
      var dataType = options.dataType;

      if (dataType && accepts[dataType]) {
        return accepts[dataType];
      }

      return accepts['*'];
    }

    function xhrSetRequestHeader(xhr, options) {
      xhr.setRequestHeader("Accepts", acceptsHeader(options));
    }

    function xhrGetLoadStatus(xhr) {
      return xhr.status;
    }

    function xdrGetLoadStatus() {
      return 200;
    }

    var NONE = {};

    function trigger(event, oasis) {
      if (!oasis) { return; }

      var args = a_slice.call(arguments, 2);

      args.unshift(event);
      oasis.trigger.apply(oasis, args);
    }

    var accepts = {
      "*": "*/*",
      text: "text/plain",
      html: "text/html",
      xml: "application/xml, text/xml",
      json: "application/json, text/javascript"
    };

    var XHR, setRequestHeader, getLoadStatus, send;

    try {
      if ('withCredentials' in new XMLHttpRequest()) {
        XHR = XMLHttpRequest;
        setRequestHeader = xhrSetRequestHeader;
        getLoadStatus = xhrGetLoadStatus;
      } else if (typeof XDomainRequest !== 'undefined') {
        XHR = XDomainRequest;
        setRequestHeader = noop;
        getLoadStatus = xdrGetLoadStatus;
      }
    } catch( exception ) {
      if (typeof XDomainRequest !== 'undefined') {
        XHR = XDomainRequest;
        setRequestHeader = noop;
        getLoadStatus = xdrGetLoadStatus;
      }
    }
    // else inline adapter with cross-domain cards is not going to work


    function xhr(url, options, oasis) {
      if (!oasis && this instanceof Oasis) { oasis = this; }
      if (!options) { options = NONE; }

      return new RSVP.Promise(function(resolve, reject){
        var xhr = new XHR();
        xhr.open("get", url, true);
        setRequestHeader(xhr, options);

        if (options.timeout) {
          xhr.timeout = options.timeout;
        }

        xhr.onload = function () {
          trigger('xhr.load', oasis, url, options, xhr);

          var status = getLoadStatus(xhr);
          if (status >= 200 && status < 300) {
            resolve(xhr.responseText);
          } else {
            reject(xhr);
          }
        };

        xhr.onprogress = noop;
        xhr.ontimeout = function () {
          trigger('xhr.timeout', oasis, url, options, xhr);
          reject(xhr);
        };

        xhr.onerror = function () {
          trigger('xhr.error', oasis, url, options, xhr);
          reject(xhr);
        };

        trigger('xhr.send', oasis, url, options, xhr);
        xhr.send();
      });
    }

    __exports__.xhr = xhr;
  });
define("environment-service", 
  ["oasis","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Oasis = __dependency1__["default"];

    var EnvironmentService = Oasis.Service.extend({
      initialize: function () {
        this.send('activate', this.data);
      },
      data: null //extend this property to send in data on activation
    });

    __exports__["default"] = EnvironmentService;
  });
define("spiceworks-sdk-host", 
  ["oasis","environment-service","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Oasis = __dependency1__["default"];
    var EnvironmentService = __dependency2__["default"];

    self.Oasis = Oasis;
    var oasis = new self.Oasis();
    oasis.autoInitializeSandbox();

    __exports__.oasis = oasis;
    __exports__.EnvironmentService = EnvironmentService;
  });
window.SW = require("spiceworks-sdk-host");
}(self));