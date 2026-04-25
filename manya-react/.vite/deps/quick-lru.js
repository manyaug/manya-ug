import {
  __privateAdd,
  __privateGet,
  __privateMethod,
  __privateSet,
  __privateWrapper
} from "./chunk-SNAQBZPT.js";

// node_modules/quick-lru/index.js
var _size, _cache, _oldCache, _maxSize, _maxAge, _onEviction, _QuickLRU_instances, emitEvictions_fn, deleteIfExpired_fn, getOrDeleteIfExpired_fn, getItemValue_fn, peek_fn, set_fn, moveToRecent_fn, entriesAscending_fn;
var QuickLRU = class extends Map {
  constructor(options = {}) {
    super();
    __privateAdd(this, _QuickLRU_instances);
    __privateAdd(this, _size, 0);
    __privateAdd(this, _cache, /* @__PURE__ */ new Map());
    __privateAdd(this, _oldCache, /* @__PURE__ */ new Map());
    __privateAdd(this, _maxSize);
    __privateAdd(this, _maxAge);
    __privateAdd(this, _onEviction);
    if (!(options.maxSize && options.maxSize > 0)) {
      throw new TypeError("`maxSize` must be a number greater than 0");
    }
    if (typeof options.maxAge === "number" && options.maxAge === 0) {
      throw new TypeError("`maxAge` must be a number greater than 0");
    }
    __privateSet(this, _maxSize, options.maxSize);
    __privateSet(this, _maxAge, options.maxAge || Number.POSITIVE_INFINITY);
    __privateSet(this, _onEviction, options.onEviction);
  }
  // For tests.
  get __oldCache() {
    return __privateGet(this, _oldCache);
  }
  get(key) {
    if (__privateGet(this, _cache).has(key)) {
      const item = __privateGet(this, _cache).get(key);
      return __privateMethod(this, _QuickLRU_instances, getItemValue_fn).call(this, key, item);
    }
    if (__privateGet(this, _oldCache).has(key)) {
      const item = __privateGet(this, _oldCache).get(key);
      if (__privateMethod(this, _QuickLRU_instances, deleteIfExpired_fn).call(this, key, item) === false) {
        __privateMethod(this, _QuickLRU_instances, moveToRecent_fn).call(this, key, item);
        return item.value;
      }
    }
  }
  set(key, value, { maxAge = __privateGet(this, _maxAge) } = {}) {
    const expiry = typeof maxAge === "number" && maxAge !== Number.POSITIVE_INFINITY ? Date.now() + maxAge : void 0;
    if (__privateGet(this, _cache).has(key)) {
      __privateGet(this, _cache).set(key, {
        value,
        expiry
      });
    } else {
      __privateMethod(this, _QuickLRU_instances, set_fn).call(this, key, { value, expiry });
    }
    return this;
  }
  has(key) {
    if (__privateGet(this, _cache).has(key)) {
      return !__privateMethod(this, _QuickLRU_instances, deleteIfExpired_fn).call(this, key, __privateGet(this, _cache).get(key));
    }
    if (__privateGet(this, _oldCache).has(key)) {
      return !__privateMethod(this, _QuickLRU_instances, deleteIfExpired_fn).call(this, key, __privateGet(this, _oldCache).get(key));
    }
    return false;
  }
  peek(key) {
    if (__privateGet(this, _cache).has(key)) {
      return __privateMethod(this, _QuickLRU_instances, peek_fn).call(this, key, __privateGet(this, _cache));
    }
    if (__privateGet(this, _oldCache).has(key)) {
      return __privateMethod(this, _QuickLRU_instances, peek_fn).call(this, key, __privateGet(this, _oldCache));
    }
  }
  expiresIn(key) {
    const item = __privateGet(this, _cache).get(key) ?? __privateGet(this, _oldCache).get(key);
    if (item) {
      return item.expiry ? item.expiry - Date.now() : Number.POSITIVE_INFINITY;
    }
  }
  delete(key) {
    const deleted = __privateGet(this, _cache).delete(key);
    if (deleted) {
      __privateWrapper(this, _size)._--;
    }
    return __privateGet(this, _oldCache).delete(key) || deleted;
  }
  clear() {
    __privateGet(this, _cache).clear();
    __privateGet(this, _oldCache).clear();
    __privateSet(this, _size, 0);
  }
  resize(newSize) {
    if (!(newSize && newSize > 0)) {
      throw new TypeError("`maxSize` must be a number greater than 0");
    }
    const items = [...__privateMethod(this, _QuickLRU_instances, entriesAscending_fn).call(this)];
    const removeCount = items.length - newSize;
    if (removeCount < 0) {
      __privateSet(this, _cache, new Map(items));
      __privateSet(this, _oldCache, /* @__PURE__ */ new Map());
      __privateSet(this, _size, items.length);
    } else {
      if (removeCount > 0) {
        __privateMethod(this, _QuickLRU_instances, emitEvictions_fn).call(this, items.slice(0, removeCount));
      }
      __privateSet(this, _oldCache, new Map(items.slice(removeCount)));
      __privateSet(this, _cache, /* @__PURE__ */ new Map());
      __privateSet(this, _size, 0);
    }
    __privateSet(this, _maxSize, newSize);
  }
  evict(count = 1) {
    const requested = Number(count);
    if (!requested || requested <= 0) {
      return;
    }
    const items = [...__privateMethod(this, _QuickLRU_instances, entriesAscending_fn).call(this)];
    const evictCount = Math.trunc(Math.min(requested, Math.max(items.length - 1, 0)));
    if (evictCount <= 0) {
      return;
    }
    __privateMethod(this, _QuickLRU_instances, emitEvictions_fn).call(this, items.slice(0, evictCount));
    __privateSet(this, _oldCache, new Map(items.slice(evictCount)));
    __privateSet(this, _cache, /* @__PURE__ */ new Map());
    __privateSet(this, _size, 0);
  }
  *keys() {
    for (const [key] of this) {
      yield key;
    }
  }
  *values() {
    for (const [, value] of this) {
      yield value;
    }
  }
  *[Symbol.iterator]() {
    for (const item of __privateGet(this, _cache)) {
      const [key, value] = item;
      const deleted = __privateMethod(this, _QuickLRU_instances, deleteIfExpired_fn).call(this, key, value);
      if (deleted === false) {
        yield [key, value.value];
      }
    }
    for (const item of __privateGet(this, _oldCache)) {
      const [key, value] = item;
      if (!__privateGet(this, _cache).has(key)) {
        const deleted = __privateMethod(this, _QuickLRU_instances, deleteIfExpired_fn).call(this, key, value);
        if (deleted === false) {
          yield [key, value.value];
        }
      }
    }
  }
  *entriesDescending() {
    let items = [...__privateGet(this, _cache)];
    for (let i = items.length - 1; i >= 0; --i) {
      const item = items[i];
      const [key, value] = item;
      const deleted = __privateMethod(this, _QuickLRU_instances, deleteIfExpired_fn).call(this, key, value);
      if (deleted === false) {
        yield [key, value.value];
      }
    }
    items = [...__privateGet(this, _oldCache)];
    for (let i = items.length - 1; i >= 0; --i) {
      const item = items[i];
      const [key, value] = item;
      if (!__privateGet(this, _cache).has(key)) {
        const deleted = __privateMethod(this, _QuickLRU_instances, deleteIfExpired_fn).call(this, key, value);
        if (deleted === false) {
          yield [key, value.value];
        }
      }
    }
  }
  *entriesAscending() {
    for (const [key, value] of __privateMethod(this, _QuickLRU_instances, entriesAscending_fn).call(this)) {
      yield [key, value.value];
    }
  }
  get size() {
    if (!__privateGet(this, _size)) {
      return __privateGet(this, _oldCache).size;
    }
    let oldCacheSize = 0;
    for (const key of __privateGet(this, _oldCache).keys()) {
      if (!__privateGet(this, _cache).has(key)) {
        oldCacheSize++;
      }
    }
    return Math.min(__privateGet(this, _size) + oldCacheSize, __privateGet(this, _maxSize));
  }
  get maxSize() {
    return __privateGet(this, _maxSize);
  }
  get maxAge() {
    return __privateGet(this, _maxAge);
  }
  entries() {
    return this.entriesAscending();
  }
  forEach(callbackFunction, thisArgument = this) {
    for (const [key, value] of this.entriesAscending()) {
      callbackFunction.call(thisArgument, value, key, this);
    }
  }
  get [Symbol.toStringTag]() {
    return "QuickLRU";
  }
  toString() {
    return `QuickLRU(${this.size}/${this.maxSize})`;
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toString();
  }
};
_size = new WeakMap();
_cache = new WeakMap();
_oldCache = new WeakMap();
_maxSize = new WeakMap();
_maxAge = new WeakMap();
_onEviction = new WeakMap();
_QuickLRU_instances = new WeakSet();
emitEvictions_fn = function(cache) {
  if (typeof __privateGet(this, _onEviction) !== "function") {
    return;
  }
  for (const [key, item] of cache) {
    __privateGet(this, _onEviction).call(this, key, item.value);
  }
};
deleteIfExpired_fn = function(key, item) {
  if (typeof item.expiry === "number" && item.expiry <= Date.now()) {
    if (typeof __privateGet(this, _onEviction) === "function") {
      __privateGet(this, _onEviction).call(this, key, item.value);
    }
    return this.delete(key);
  }
  return false;
};
getOrDeleteIfExpired_fn = function(key, item) {
  const deleted = __privateMethod(this, _QuickLRU_instances, deleteIfExpired_fn).call(this, key, item);
  if (deleted === false) {
    return item.value;
  }
};
getItemValue_fn = function(key, item) {
  return item.expiry ? __privateMethod(this, _QuickLRU_instances, getOrDeleteIfExpired_fn).call(this, key, item) : item.value;
};
peek_fn = function(key, cache) {
  const item = cache.get(key);
  return __privateMethod(this, _QuickLRU_instances, getItemValue_fn).call(this, key, item);
};
set_fn = function(key, value) {
  __privateGet(this, _cache).set(key, value);
  __privateWrapper(this, _size)._++;
  if (__privateGet(this, _size) >= __privateGet(this, _maxSize)) {
    __privateSet(this, _size, 0);
    __privateMethod(this, _QuickLRU_instances, emitEvictions_fn).call(this, __privateGet(this, _oldCache));
    __privateSet(this, _oldCache, __privateGet(this, _cache));
    __privateSet(this, _cache, /* @__PURE__ */ new Map());
  }
};
moveToRecent_fn = function(key, item) {
  __privateGet(this, _oldCache).delete(key);
  __privateMethod(this, _QuickLRU_instances, set_fn).call(this, key, item);
};
entriesAscending_fn = function* () {
  for (const item of __privateGet(this, _oldCache)) {
    const [key, value] = item;
    if (!__privateGet(this, _cache).has(key)) {
      const deleted = __privateMethod(this, _QuickLRU_instances, deleteIfExpired_fn).call(this, key, value);
      if (deleted === false) {
        yield item;
      }
    }
  }
  for (const item of __privateGet(this, _cache)) {
    const [key, value] = item;
    const deleted = __privateMethod(this, _QuickLRU_instances, deleteIfExpired_fn).call(this, key, value);
    if (deleted === false) {
      yield item;
    }
  }
};
export {
  QuickLRU as default
};
//# sourceMappingURL=quick-lru.js.map
