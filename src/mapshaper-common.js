
var api = {};
var MapShaper = api.internal = {};
var geom = api.geom = {};
var utils = api.utils = Utils.extend({}, Utils);

MapShaper.LOGGING = false;
MapShaper.TRACING = false;
MapShaper.VERBOSE = false;

api.enableLogging = function() {
  MapShaper.LOGGING = true;
  return api;
};

api.printError = function(err) {
  var msg;
  if (utils.isString(err)) {
    err = new APIError(err);
  }
  if (MapShaper.LOGGING && err.name == 'APIError') {
    msg = err.message ? "Error: " + err.message : "Processing failed";
    message(msg);
    message("Run mapshaper -h to view help");
  } else {
    throw err;
  }
};

// Handle an error caused by invalid input or misuse of API
function stop() {
  throw new APIError(MapShaper.formatArgs(arguments));
}

function APIError(msg) {
  var err = new Error(msg);
  err.name = 'APIError';
  return err;
}

var warning = function() {
  message("Warning: " + MapShaper.formatArgs(arguments));
};

var message = function() {
  if (MapShaper.LOGGING) {
    MapShaper.logArgs(arguments);
  }
};

var verbose = function() {
  if (MapShaper.VERBOSE && MapShaper.LOGGING) {
    MapShaper.logArgs(arguments);
  }
};

var trace = function() {
  if (MapShaper.TRACING) {
    MapShaper.logArgs(arguments);
  }
};

MapShaper.formatArgs = function(args) {
  return utils.toArray(args).join(' ');
};

// Format an array of (preferably short) strings in columns for console logging.
MapShaper.formatStringsAsGrid = function(arr) {
  // TODO: variable column width
  var longest = arr.reduce(function(len, str) {
        return Math.max(len, str.length);
      }, 0),
      colWidth = longest + 1,
      perLine = Math.floor(80 / colWidth) || 1;
  return arr.reduce(function(str, name, i) {
    if (i > 0 && i % perLine === 0) str += '\n';
    return str + ' ' + utils.rpad(name, colWidth-1, ' ');
  }, '');
};

MapShaper.logArgs = function(args) {
  if (utils.isArrayLike(args)) {
    (console.error || console.log).call(console, MapShaper.formatArgs(args));
  }
};

function absArcId(arcId) {
  return arcId >= 0 ? arcId : ~arcId;
}

utils.wildcardToRegExp = function(name) {
  var rxp = name.split('*').map(function(str) {
    return utils.regexEscape(str);
  }).join('.*');
  return new RegExp(rxp);
};

MapShaper.expandoBuffer = function(constructor, rate) {
  var capacity = 0,
      k = rate >= 1 ? rate : 1.2,
      buf;
  return function(size) {
    if (size > capacity) {
      capacity = Math.ceil(size * k);
      buf = new constructor(capacity);
    }
    return buf;
  };
};

MapShaper.copyElements = function(src, i, dest, j, n, rev) {
  if (src === dest && j > i) error ("copy error");
  var inc = 1,
      offs = 0;
  if (rev) {
    inc = -1;
    offs = n - 1;
  }
  for (var k=0; k<n; k++, offs += inc) {
    dest[k + j] = src[i + offs];
  }
};

MapShaper.extendBuffer = function(src, newLen, copyLen) {
  var len = Math.max(src.length, newLen);
  var n = copyLen || src.length;
  var dest = new src.constructor(len);
  MapShaper.copyElements(src, 0, dest, 0, n);
  return dest;
};

MapShaper.mergeNames = function(name1, name2) {
  var merged = "";
  if (name1 && name2) {
    merged = utils.findStringPrefix(name1, name2).replace(/[-_]$/, '');
  }
  return merged;
};

utils.findStringPrefix = function(a, b) {
  var i = 0;
  for (var n=a.length; i<n; i++) {
    if (a[i] !== b[i]) break;
  }
  return a.substr(0, i);
};

// Similar to isFinite() but returns false for null
utils.isFiniteNumber = function(val) {
  return isFinite(val) && val !== null;
};

MapShaper.getWorldBounds = function(e) {
  e = utils.isFiniteNumber(e) ? e : 1e-10;
  return [-180 + e, -90 + e, 180 - e, 90 - e];
};

MapShaper.probablyDecimalDegreeBounds = function(b) {
  var world = MapShaper.getWorldBounds(-1), // add a bit of excess
      bbox = (b instanceof Bounds) ? b.toArray() : b;
  return containsBounds(world, bbox);
};

MapShaper.layerHasPaths = function(lyr) {
  return lyr.shapes && (lyr.geometry_type == 'polygon' || lyr.geometry_type == 'polyline');
};

MapShaper.layerHasPoints = function(lyr) {
  return lyr.shapes && lyr.geometry_type == 'point';
};

MapShaper.requirePolygonLayer = function(lyr, msg) {
  if (!lyr || lyr.geometry_type !== 'polygon') stop(msg || "Expected a polygon layer");
};

MapShaper.requirePathLayer = function(lyr, msg) {
  if (!lyr || !MapShaper.layerHasPaths(lyr)) stop(msg || "Expected a polygon or polyline layer");
};
