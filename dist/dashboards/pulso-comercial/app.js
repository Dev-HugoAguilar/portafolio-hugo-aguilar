// \0rolldown/runtime.js
var e = (e, t) => () => (t || (e((t = { exports: {} }).exports, t, t.exports), e = null), t.exports), t = /* @__PURE__ */ e(((e) => {
	function t(e, t) {
		var n = e.length;
		e.push(t);
		a: for (; 0 < n;) {
			var r = n - 1 >>> 1, a = e[r];
			if (0 < i(a, t)) e[r] = t, e[n] = a, n = r;
			else break a;
		}
	}
	function n(e) {
		return e.length === 0 ? null : e[0];
	}
	function r(e) {
		if (e.length === 0) return null;
		var t = e[0], n = e.pop();
		if (n !== t) {
			e[0] = n;
			a: for (var r = 0, a = e.length, o = a >>> 1; r < o;) {
				var s = 2 * (r + 1) - 1, c = e[s], l = s + 1, u = e[l];
				if (0 > i(c, n)) l < a && 0 > i(u, c) ? (e[r] = u, e[l] = n, r = l) : (e[r] = c, e[s] = n, r = s);
				else if (l < a && 0 > i(u, n)) e[r] = u, e[l] = n, r = l;
				else break a;
			}
		}
		return t;
	}
	function i(e, t) {
		var n = e.sortIndex - t.sortIndex;
		return n === 0 ? e.id - t.id : n;
	}
	if (e.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
		var a = performance;
		e.unstable_now = function() {
			return a.now();
		};
	} else {
		var o = Date, s = o.now();
		e.unstable_now = function() {
			return o.now() - s;
		};
	}
	var c = [], l = [], u = 1, d = null, f = 3, p = !1, m = !1, h = !1, g = !1, _ = typeof setTimeout == "function" ? setTimeout : null, v = typeof clearTimeout == "function" ? clearTimeout : null, y = typeof setImmediate < "u" ? setImmediate : null;
	function b(e) {
		for (var i = n(l); i !== null;) {
			if (i.callback === null) r(l);
			else if (i.startTime <= e) r(l), i.sortIndex = i.expirationTime, t(c, i);
			else break;
			i = n(l);
		}
	}
	function x(e) {
		if (h = !1, b(e), !m) {
			if (n(c) !== null) m = !0, S || (S = !0, O());
			else {
				var t = n(l);
				t !== null && A(x, t.startTime - e);
			}
		}
	}
	var S = !1, C = -1, w = 5, T = -1;
	function E() {
		return g ? !0 : !(e.unstable_now() - T < w);
	}
	function D() {
		if (g = !1, S) {
			var t = e.unstable_now();
			T = t;
			var i = !0;
			try {
				a: {
					m = !1, h && (h = !1, v(C), C = -1), p = !0;
					var a = f;
					try {
						b: {
							for (b(t), d = n(c); d !== null && !(d.expirationTime > t && E());) {
								var o = d.callback;
								if (typeof o == "function") {
									d.callback = null, f = d.priorityLevel;
									var s = o(d.expirationTime <= t);
									if (t = e.unstable_now(), typeof s == "function") {
										d.callback = s, b(t), i = !0;
										break b;
									}
									d === n(c) && r(c), b(t);
								} else r(c);
								d = n(c);
							}
							if (d !== null) i = !0;
							else {
								var u = n(l);
								u !== null && A(x, u.startTime - t), i = !1;
							}
						}
						break a;
					} finally {
						d = null, f = a, p = !1;
					}
					i = void 0;
				}
			} finally {
				i ? O() : S = !1;
			}
		}
	}
	var O;
	if (typeof y == "function") O = function() {
		y(D);
	};
	else if (typeof MessageChannel < "u") {
		var k = new MessageChannel(), ee = k.port2;
		k.port1.onmessage = D, O = function() {
			ee.postMessage(null);
		};
	} else O = function() {
		_(D, 0);
	};
	function A(t, n) {
		C = _(function() {
			t(e.unstable_now());
		}, n);
	}
	e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(e) {
		e.callback = null;
	}, e.unstable_forceFrameRate = function(e) {
		0 > e || 125 < e ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : w = 0 < e ? Math.floor(1e3 / e) : 5;
	}, e.unstable_getCurrentPriorityLevel = function() {
		return f;
	}, e.unstable_next = function(e) {
		switch (f) {
			case 1:
			case 2:
			case 3:
				var t = 3;
				break;
			default: t = f;
		}
		var n = f;
		f = t;
		try {
			return e();
		} finally {
			f = n;
		}
	}, e.unstable_requestPaint = function() {
		g = !0;
	}, e.unstable_runWithPriority = function(e, t) {
		switch (e) {
			case 1:
			case 2:
			case 3:
			case 4:
			case 5: break;
			default: e = 3;
		}
		var n = f;
		f = e;
		try {
			return t();
		} finally {
			f = n;
		}
	}, e.unstable_scheduleCallback = function(r, i, a) {
		var o = e.unstable_now();
		switch (typeof a == "object" && a ? (a = a.delay, a = typeof a == "number" && 0 < a ? o + a : o) : a = o, r) {
			case 1:
				var s = -1;
				break;
			case 2:
				s = 250;
				break;
			case 5:
				s = 1073741823;
				break;
			case 4:
				s = 1e4;
				break;
			default: s = 5e3;
		}
		return s = a + s, r = {
			id: u++,
			callback: i,
			priorityLevel: r,
			startTime: a,
			expirationTime: s,
			sortIndex: -1
		}, a > o ? (r.sortIndex = a, t(l, r), n(c) === null && r === n(l) && (h ? (v(C), C = -1) : h = !0, A(x, a - o))) : (r.sortIndex = s, t(c, r), m || p || (m = !0, S || (S = !0, O()))), r;
	}, e.unstable_shouldYield = E, e.unstable_wrapCallback = function(e) {
		var t = f;
		return function() {
			var n = f;
			f = t;
			try {
				return e.apply(this, arguments);
			} finally {
				f = n;
			}
		};
	};
})), n = /* @__PURE__ */ e(((e, n) => {
	n.exports = t();
})), r = /* @__PURE__ */ e(((e) => {
	var t = Symbol.for("react.transitional.element"), n = Symbol.for("react.portal"), r = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), o = Symbol.for("react.consumer"), s = Symbol.for("react.context"), c = Symbol.for("react.forward_ref"), l = Symbol.for("react.suspense"), u = Symbol.for("react.memo"), d = Symbol.for("react.lazy"), f = Symbol.for("react.activity"), p = Symbol.for("react.view_transition"), m = Symbol.iterator;
	function h(e) {
		return typeof e != "object" || !e ? null : (e = m && e[m] || e["@@iterator"], typeof e == "function" ? e : null);
	}
	var g = {
		isMounted: function() {
			return !1;
		},
		enqueueForceUpdate: function() {},
		enqueueReplaceState: function() {},
		enqueueSetState: function() {}
	}, _ = Object.assign, v = {};
	function y(e, t, n) {
		this.props = e, this.context = t, this.refs = v, this.updater = n || g;
	}
	y.prototype.isReactComponent = {}, y.prototype.setState = function(e, t) {
		if (typeof e != "object" && typeof e != "function" && e != null) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
		this.updater.enqueueSetState(this, e, t, "setState");
	}, y.prototype.forceUpdate = function(e) {
		this.updater.enqueueForceUpdate(this, e, "forceUpdate");
	};
	function b() {}
	b.prototype = y.prototype;
	function x(e, t, n) {
		this.props = e, this.context = t, this.refs = v, this.updater = n || g;
	}
	var S = x.prototype = new b();
	S.constructor = x, _(S, y.prototype), S.isPureReactComponent = !0;
	var C = Array.isArray;
	function w() {}
	var T = {
		H: null,
		A: null,
		T: null,
		S: null
	}, E = Object.prototype.hasOwnProperty;
	function D(e, n, r) {
		var i = r.ref;
		return {
			$$typeof: t,
			type: e,
			key: n,
			ref: i === void 0 ? null : i,
			props: r
		};
	}
	function O(e, t) {
		return D(e.type, t, e.props);
	}
	function k(e) {
		return typeof e == "object" && !!e && e.$$typeof === t;
	}
	function ee(e) {
		var t = {
			"=": "=0",
			":": "=2"
		};
		return "$" + e.replace(/[=:]/g, function(e) {
			return t[e];
		});
	}
	var A = /\/+/g;
	function te(e, t) {
		return typeof e == "object" && e && e.key != null ? ee("" + e.key) : t.toString(36);
	}
	function ne(e) {
		switch (e.status) {
			case "fulfilled": return e.value;
			case "rejected": throw e.reason;
			default: switch (typeof e.status == "string" ? e.then(w, w) : (e.status = "pending", e.then(function(t) {
				e.status === "pending" && (e.status = "fulfilled", e.value = t);
			}, function(t) {
				e.status === "pending" && (e.status = "rejected", e.reason = t);
			})), e.status) {
				case "fulfilled": return e.value;
				case "rejected": throw e.reason;
			}
		}
		throw e;
	}
	function j(e, r, i, a, o) {
		var s = typeof e;
		(s === "undefined" || s === "boolean") && (e = null);
		var c = !1;
		if (e === null) c = !0;
		else switch (s) {
			case "bigint":
			case "string":
			case "number":
				c = !0;
				break;
			case "object": switch (e.$$typeof) {
				case t:
				case n:
					c = !0;
					break;
				case d: return c = e._init, j(c(e._payload), r, i, a, o);
			}
		}
		if (c) return o = o(e), c = a === "" ? "." + te(e, 0) : a, C(o) ? (i = "", c != null && (i = c.replace(A, "$&/") + "/"), j(o, r, i, "", function(e) {
			return e;
		})) : o != null && (k(o) && (o = O(o, i + (o.key == null || e && e.key === o.key ? "" : ("" + o.key).replace(A, "$&/") + "/") + c)), r.push(o)), 1;
		c = 0;
		var l = a === "" ? "." : a + ":";
		if (C(e)) for (var u = 0; u < e.length; u++) a = e[u], s = l + te(a, u), c += j(a, r, i, s, o);
		else if (u = h(e), typeof u == "function") for (e = u.call(e), u = 0; !(a = e.next()).done;) a = a.value, s = l + te(a, u++), c += j(a, r, i, s, o);
		else if (s === "object") {
			if (typeof e.then == "function") return j(ne(e), r, i, a, o);
			throw r = String(e), Error("Objects are not valid as a React child (found: " + (r === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : r) + "). If you meant to render a collection of children, use an array instead.");
		}
		return c;
	}
	function M(e, t, n) {
		if (e == null) return e;
		var r = [], i = 0;
		return j(e, r, "", "", function(e) {
			return t.call(n, e, i++);
		}), r;
	}
	function re(e) {
		if (e._status === -1) {
			var t = e._result, n = t();
			n.then(function(t) {
				(e._status === 0 || e._status === -1) && (e._status = 1, e._result = t, n.status === void 0 && (n.status = "fulfilled", n.value = t));
			}, function(t) {
				(e._status === 0 || e._status === -1) && (e._status = 2, e._result = t, n.status === void 0 && (n.status = "rejected", n.reason = t));
			}), e._status === -1 && (e._status = 0, e._result = n);
		}
		if (e._status === 1) return e._result.default;
		throw e._result;
	}
	var ie = typeof reportError == "function" ? reportError : function(e) {
		if (typeof window == "object" && typeof window.ErrorEvent == "function") {
			var t = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: typeof e == "object" && e && typeof e.message == "string" ? String(e.message) : String(e),
				error: e
			});
			if (!window.dispatchEvent(t)) return;
		} else if (typeof process == "object" && typeof process.emit == "function") {
			process.emit("uncaughtException", e);
			return;
		}
		console.error(e);
	};
	function ae(e) {
		var t = T.T, n = {};
		n.types = t === null ? null : t.types, T.T = n;
		try {
			var r = e(), i = T.S;
			i !== null && i(n, r), typeof r == "object" && r && typeof r.then == "function" && r.then(w, ie);
		} catch (e) {
			ie(e);
		} finally {
			t !== null && n.types !== null && (t.types = n.types), T.T = t;
		}
	}
	function oe(e) {
		var t = T.T;
		if (t !== null) {
			var n = t.types;
			n === null ? t.types = [e] : n.indexOf(e) === -1 && n.push(e);
		} else ae(oe.bind(null, e));
	}
	var se = {
		map: M,
		forEach: function(e, t, n) {
			M(e, function() {
				t.apply(this, arguments);
			}, n);
		},
		count: function(e) {
			var t = 0;
			return M(e, function() {
				t++;
			}), t;
		},
		toArray: function(e) {
			return M(e, function(e) {
				return e;
			}) || [];
		},
		only: function(e) {
			if (!k(e)) throw Error("React.Children.only expected to receive a single React element child.");
			return e;
		}
	};
	e.Activity = f, e.Children = se, e.Component = y, e.Fragment = r, e.Profiler = a, e.PureComponent = x, e.StrictMode = i, e.Suspense = l, e.ViewTransition = p, e.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = T, e.__COMPILER_RUNTIME = {
		__proto__: null,
		c: function(e) {
			return T.H.useMemoCache(e);
		}
	}, e.addTransitionType = oe, e.cache = function(e) {
		return function() {
			return e.apply(null, arguments);
		};
	}, e.cacheSignal = function() {
		return null;
	}, e.cloneElement = function(e, t, n) {
		if (e == null) throw Error("The argument must be a React element, but you passed " + e + ".");
		var r = _({}, e.props), i = e.key;
		if (t != null) for (a in t.key !== void 0 && (i = "" + t.key), t) !E.call(t, a) || a === "key" || a === "__self" || a === "__source" || a === "ref" && t.ref === void 0 || (r[a] = t[a]);
		var a = arguments.length - 2;
		if (a === 1) r.children = n;
		else if (1 < a) {
			for (var o = Array(a), s = 0; s < a; s++) o[s] = arguments[s + 2];
			r.children = o;
		}
		return D(e.type, i, r);
	}, e.createContext = function(e) {
		return e = {
			$$typeof: s,
			_currentValue: e,
			_currentValue2: e,
			_threadCount: 0,
			Provider: null,
			Consumer: null
		}, e.Provider = e, e.Consumer = {
			$$typeof: o,
			_context: e
		}, e;
	}, e.createElement = function(e, t, n) {
		var r, i = {}, a = null;
		if (t != null) for (r in t.key !== void 0 && (a = "" + t.key), t) E.call(t, r) && r !== "key" && r !== "__self" && r !== "__source" && (i[r] = t[r]);
		var o = arguments.length - 2;
		if (o === 1) i.children = n;
		else if (1 < o) {
			for (var s = Array(o), c = 0; c < o; c++) s[c] = arguments[c + 2];
			i.children = s;
		}
		if (e && e.defaultProps) for (r in o = e.defaultProps, o) i[r] === void 0 && (i[r] = o[r]);
		return D(e, a, i);
	}, e.createRef = function() {
		return { current: null };
	}, e.forwardRef = function(e) {
		return {
			$$typeof: c,
			render: e
		};
	}, e.isValidElement = k, e.lazy = function(e) {
		return {
			$$typeof: d,
			_payload: {
				_status: -1,
				_result: e
			},
			_init: re
		};
	}, e.memo = function(e, t) {
		return {
			$$typeof: u,
			type: e,
			compare: t === void 0 ? null : t
		};
	}, e.startTransition = ae, e.unstable_useCacheRefresh = function() {
		return T.H.useCacheRefresh();
	}, e.use = function(e) {
		return T.H.use(e);
	}, e.useActionState = function(e, t, n) {
		return T.H.useActionState(e, t, n);
	}, e.useCallback = function(e, t) {
		return T.H.useCallback(e, t);
	}, e.useContext = function(e) {
		return T.H.useContext(e);
	}, e.useDebugValue = function() {}, e.useDeferredValue = function(e, t) {
		return T.H.useDeferredValue(e, t);
	}, e.useEffect = function(e, t) {
		return T.H.useEffect(e, t);
	}, e.useEffectEvent = function(e) {
		return T.H.useEffectEvent(e);
	}, e.useId = function() {
		return T.H.useId();
	}, e.useImperativeHandle = function(e, t, n) {
		return T.H.useImperativeHandle(e, t, n);
	}, e.useInsertionEffect = function(e, t) {
		return T.H.useInsertionEffect(e, t);
	}, e.useLayoutEffect = function(e, t) {
		return T.H.useLayoutEffect(e, t);
	}, e.useMemo = function(e, t) {
		return T.H.useMemo(e, t);
	}, e.useOptimistic = function(e, t) {
		return T.H.useOptimistic(e, t);
	}, e.useReducer = function(e, t, n) {
		return T.H.useReducer(e, t, n);
	}, e.useRef = function(e) {
		return T.H.useRef(e);
	}, e.useState = function(e) {
		return T.H.useState(e);
	}, e.useSyncExternalStore = function(e, t, n) {
		return T.H.useSyncExternalStore(e, t, n);
	}, e.useTransition = function() {
		return T.H.useTransition();
	}, e.version = "19.3.1";
})), i = /* @__PURE__ */ e(((e, t) => {
	t.exports = r();
})), a = /* @__PURE__ */ e(((e) => {
	var t = i();
	function n(e) {
		var t = "https://react.dev/errors/" + e;
		if (1 < arguments.length) {
			t += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var n = 2; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
		}
		return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	function r() {}
	var a = {
		d: {
			f: r,
			r: function() {
				throw Error(n(522));
			},
			D: r,
			C: r,
			L: r,
			m: r,
			X: r,
			S: r,
			M: r
		},
		p: 0,
		findDOMNode: null
	}, o = Symbol.for("react.portal"), s = Symbol.for("react.recoverable"), c = Symbol.for("react.optimistic_key");
	function l(e, t, n) {
		var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
		return {
			$$typeof: o,
			key: r == null ? null : r === c ? c : "" + r,
			children: e,
			containerInfo: t,
			implementation: n
		};
	}
	var u = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
	function d(e, t) {
		if (e === "font") return "";
		if (typeof t == "string") return t === "use-credentials" ? t : "";
	}
	e.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = a, e.browser = function(e) {
		return {
			$$typeof: s,
			_reason: e
		};
	}, e.createPortal = function(e, t) {
		var r = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
		if (!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11) throw Error(n(299));
		return l(e, t, null, r);
	}, e.flushSync = function(e) {
		var t = u.T, n = a.p;
		try {
			if (u.T = null, a.p = 2, e) return e();
		} finally {
			u.T = t, a.p = n, a.d.f();
		}
	}, e.preconnect = function(e, t) {
		typeof e == "string" && (t ? (t = t.crossOrigin, t = typeof t == "string" ? t === "use-credentials" ? t : "" : void 0) : t = null, a.d.C(e, t));
	}, e.prefetchDNS = function(e) {
		typeof e == "string" && a.d.D(e);
	}, e.preinit = function(e, t) {
		if (typeof e == "string" && t && typeof t.as == "string") {
			var n = t.as, r = d(n, t.crossOrigin), i = typeof t.integrity == "string" ? t.integrity : void 0, o = typeof t.fetchPriority == "string" ? t.fetchPriority : void 0;
			n === "style" ? a.d.S(e, typeof t.precedence == "string" ? t.precedence : void 0, {
				crossOrigin: r,
				integrity: i,
				fetchPriority: o
			}) : n === "script" && a.d.X(e, {
				crossOrigin: r,
				integrity: i,
				fetchPriority: o,
				nonce: typeof t.nonce == "string" ? t.nonce : void 0
			});
		}
	}, e.preinitModule = function(e, t) {
		if (typeof e == "string") {
			if (typeof t == "object" && t) {
				if (t.as == null || t.as === "script") {
					var n = d(t.as, t.crossOrigin);
					a.d.M(e, {
						crossOrigin: n,
						integrity: typeof t.integrity == "string" ? t.integrity : void 0,
						nonce: typeof t.nonce == "string" ? t.nonce : void 0,
						fetchPriority: typeof t.fetchPriority == "string" ? t.fetchPriority : void 0
					});
				}
			} else t ?? a.d.M(e);
		}
	}, e.preload = function(e, t) {
		if (typeof e == "string" && typeof t == "object" && t && typeof t.as == "string") {
			var n = t.as, r = d(n, t.crossOrigin);
			a.d.L(e, n, {
				crossOrigin: r,
				integrity: typeof t.integrity == "string" ? t.integrity : void 0,
				nonce: typeof t.nonce == "string" ? t.nonce : void 0,
				type: typeof t.type == "string" ? t.type : void 0,
				fetchPriority: typeof t.fetchPriority == "string" ? t.fetchPriority : void 0,
				referrerPolicy: typeof t.referrerPolicy == "string" ? t.referrerPolicy : void 0,
				imageSrcSet: typeof t.imageSrcSet == "string" ? t.imageSrcSet : void 0,
				imageSizes: typeof t.imageSizes == "string" ? t.imageSizes : void 0,
				media: typeof t.media == "string" ? t.media : void 0
			});
		}
	}, e.preloadModule = function(e, t) {
		if (typeof e == "string") {
			if (t) {
				var n = d(t.as, t.crossOrigin);
				a.d.m(e, {
					as: typeof t.as == "string" && t.as !== "script" ? t.as : void 0,
					crossOrigin: n,
					integrity: typeof t.integrity == "string" ? t.integrity : void 0,
					nonce: typeof t.nonce == "string" ? t.nonce : void 0,
					fetchPriority: typeof t.fetchPriority == "string" ? t.fetchPriority : void 0
				});
			} else a.d.m(e);
		}
	}, e.requestFormReset = function(e) {
		a.d.r(e);
	}, e.unstable_batchedUpdates = function(e, t) {
		return e(t);
	}, e.useFormState = function(e, t, n) {
		return u.H.useFormState(e, t, n);
	}, e.useFormStatus = function() {
		return u.H.useHostTransitionStatus();
	}, e.version = "19.3.1";
})), o = /* @__PURE__ */ e(((e, t) => {
	function n() {
		if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE == "function") try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
		} catch (e) {
			console.error(e);
		}
	}
	n(), t.exports = a();
})), s = /* @__PURE__ */ e(((e) => {
	var t = n(), r = i(), a = o();
	function s(e) {
		var t = "https://react.dev/errors/" + e;
		if (1 < arguments.length) {
			t += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var n = 2; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
		}
		return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	function c(e) {
		return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
	}
	function l(e) {
		for (var t = e, n = t; n && !n.alternate;) t = n, t.flags & 4098 && (e = t.return), n = t.return;
		for (; t.return;) t = t.return;
		return t.tag === 3 ? e : null;
	}
	function u(e) {
		if (e.tag === 13) {
			var t = e.memoizedState;
			if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
		}
		return null;
	}
	function d(e) {
		if (e.tag === 31) {
			var t = e.memoizedState;
			if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
		}
		return null;
	}
	function f(e) {
		if (l(e) !== e) throw Error(s(188));
	}
	function p(e) {
		var t = e.alternate;
		if (!t) {
			if (t = l(e), t === null) throw Error(s(188));
			return t === e ? e : null;
		}
		for (var n = e, r = t;;) {
			var i = n.return;
			if (i === null) break;
			var a = i.alternate;
			if (a === null) {
				if (r = i.return, r !== null) {
					n = r;
					continue;
				}
				break;
			}
			if (i.child === a.child) {
				for (a = i.child; a;) {
					if (a === n) return f(i), e;
					if (a === r) return f(i), t;
					a = a.sibling;
				}
				throw Error(s(188));
			}
			if (n.return !== r.return) n = i, r = a;
			else {
				for (var o = !1, c = i.child; c;) {
					if (c === n) {
						o = !0, n = i, r = a;
						break;
					}
					if (c === r) {
						o = !0, r = i, n = a;
						break;
					}
					c = c.sibling;
				}
				if (!o) {
					for (c = a.child; c;) {
						if (c === n) {
							o = !0, n = a, r = i;
							break;
						}
						if (c === r) {
							o = !0, r = a, n = i;
							break;
						}
						c = c.sibling;
					}
					if (!o) throw Error(s(189));
				}
			}
			if (n.alternate !== r) throw Error(s(190));
		}
		if (n.tag !== 3) throw Error(s(188));
		return n.stateNode.current === n ? e : t;
	}
	function m(e) {
		var t = e.tag;
		if (t === 5 || t === 26 || t === 27 || t === 6) return e;
		for (e = e.child; e !== null;) {
			if (t = m(e), t !== null) return t;
			e = e.sibling;
		}
		return null;
	}
	function h(e, t, n, r, i, a) {
		for (; e !== null;) {
			if ((e.tag === 5 || e.tag === 27 || e.tag === 6) && n(e, r, i, a) || (e.tag !== 22 || e.memoizedState === null) && (t || e.tag !== 5 && e.tag !== 27) && h(e.child, t, n, r, i, a)) return !0;
			e = e.sibling;
		}
		return !1;
	}
	function g(e) {
		for (e = e.return; e !== null;) {
			if (e.tag === 3 || e.tag === 5 || e.tag === 27) return e;
			e = e.return;
		}
		return null;
	}
	function _(e) {
		var t = !1;
		for (e = e.return; e !== null && (e.tag === 4 && (t = !0), e.tag !== 3 && e.tag !== 5 && e.tag !== 27);) e = e.return;
		return t;
	}
	function v(e) {
		var t = [null, null], n = g(e);
		return n === null || y(t, e, n.child, { foundSelf: !1 }), t;
	}
	function y(e, t, n, r) {
		for (; n !== null;) {
			if (n === t) r.foundSelf = !0;
			else if (n.tag === 5 || n.tag === 27 || n.tag === 6) {
				if (r.foundSelf) return e[1] = n, !0;
				e[0] = n;
			} else if ((n.tag !== 22 || n.memoizedState === null) && y(e, t, n.child, r)) return !0;
			n = n.sibling;
		}
		return !1;
	}
	function b(e) {
		switch (e.tag) {
			case 5:
			case 27:
			case 6: return e.stateNode;
			case 3: return e.stateNode.containerInfo;
			default: throw Error(s(559));
		}
	}
	var x = null, S = null;
	function C(e, t, n) {
		return e === n || e === t && (x = e, !0);
	}
	function w(e, t, n) {
		return e === n ? (S = e, !1) : e === t && (S !== null && (x = e), !0);
	}
	function T(e) {
		if (e === null) return null;
		do
			e = e === null ? null : e.return;
		while (e && e.tag !== 5 && e.tag !== 27 && e.tag !== 3);
		return e || null;
	}
	function E(e, t, n) {
		for (var r = 0, i = e; i; i = n(i)) r++;
		i = 0;
		for (var a = t; a; a = n(a)) i++;
		for (; 0 < r - i;) e = n(e), r--;
		for (; 0 < i - r;) t = n(t), i--;
		for (; r--;) {
			if (e === t || t !== null && e === t.alternate) return e;
			e = n(e), t = n(t);
		}
		return null;
	}
	var D = Object.assign, O = Symbol.for("react.element"), k = Symbol.for("react.transitional.element"), ee = Symbol.for("react.portal"), A = Symbol.for("react.fragment"), te = Symbol.for("react.strict_mode"), ne = Symbol.for("react.profiler"), j = Symbol.for("react.consumer"), M = Symbol.for("react.context"), re = Symbol.for("react.forward_ref"), ie = Symbol.for("react.suspense"), ae = Symbol.for("react.suspense_list"), oe = Symbol.for("react.memo"), se = Symbol.for("react.lazy"), ce = Symbol.for("react.activity"), le = Symbol.for("react.legacy_hidden"), ue = Symbol.for("react.memo_cache_sentinel"), de = Symbol.for("react.view_transition"), fe = Symbol.for("react.recoverable"), pe = Symbol.iterator;
	function me(e) {
		return typeof e != "object" || !e ? null : (e = pe && e[pe] || e["@@iterator"], typeof e == "function" ? e : null);
	}
	var he = Symbol.for("react.client.reference");
	function ge(e) {
		if (e == null) return null;
		if (typeof e == "function") return e.$$typeof === he ? null : e.displayName || e.name || null;
		if (typeof e == "string") return e;
		switch (e) {
			case A: return "Fragment";
			case ne: return "Profiler";
			case te: return "StrictMode";
			case ie: return "Suspense";
			case ae: return "SuspenseList";
			case ce: return "Activity";
			case de: return "ViewTransition";
		}
		if (typeof e == "object") switch (e.$$typeof) {
			case ee: return "Portal";
			case M: return e.displayName || "Context";
			case j: return (e._context.displayName || "Context") + ".Consumer";
			case re:
				var t = e.render;
				return e = e.displayName, e || (e = t.displayName || t.name || "", e = e === "" ? "ForwardRef" : "ForwardRef(" + e + ")"), e;
			case oe: return t = e.displayName || null, t === null ? ge(e.type) || "Memo" : t;
			case se:
				t = e._payload, e = e._init;
				try {
					return ge(e(t));
				} catch {}
		}
		return null;
	}
	var _e = Array.isArray, N = r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, P = a.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, ve = {
		pending: !1,
		data: null,
		method: null,
		action: null
	}, ye = [], be = -1;
	function xe(e) {
		return { current: e };
	}
	function Se(e) {
		0 > be || (e.current = ye[be], ye[be] = null, be--);
	}
	function F(e, t) {
		be++, ye[be] = e.current, e.current = t;
	}
	var Ce = xe(null), we = xe(null), Te = xe(null), Ee = xe(null);
	function De(e, t) {
		switch (F(Te, t), F(we, e), F(Ce, null), t.nodeType) {
			case 9:
			case 11:
				e = (e = t.documentElement) && (e = e.namespaceURI) ? up(e) : 0;
				break;
			default: if (e = t.tagName, t = t.namespaceURI) t = up(t), e = dp(t, e);
			else switch (e) {
				case "svg":
					e = 1;
					break;
				case "math":
					e = 2;
					break;
				default: e = 0;
			}
		}
		Se(Ce), F(Ce, e);
	}
	function Oe() {
		Se(Ce), Se(we), Se(Te);
	}
	function ke(e) {
		var t = e.memoizedState;
		t !== null && (sh._currentValue = t.memoizedState, F(Ee, e)), t = Ce.current;
		var n = dp(t, e.type);
		t !== n && (F(we, e), F(Ce, n));
	}
	function Ae(e) {
		we.current === e && (Se(Ce), Se(we)), Ee.current === e && (Se(Ee), sh._currentValue = ve);
	}
	var je, Me;
	function Ne(e) {
		if (je === void 0) try {
			throw Error();
		} catch (e) {
			var t = e.stack.trim().match(/\n( *(at )?)/);
			je = t && t[1] || "", Me = -1 < e.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < e.stack.indexOf("@") ? "@unknown:0:0" : "";
		}
		return "\n" + je + e + Me;
	}
	var Pe = !1;
	function Fe(e, t) {
		if (!e || Pe) return "";
		Pe = !0;
		var n = Error.prepareStackTrace;
		Error.prepareStackTrace = void 0;
		try {
			var r = { DetermineComponentFrameRoot: function() {
				try {
					if (t) {
						var n = function() {
							throw Error();
						};
						if (Object.defineProperty(n.prototype, "props", { set: function() {
							throw Error();
						} }), typeof Reflect == "object" && Reflect.construct) {
							try {
								Reflect.construct(n, []);
							} catch (e) {
								var r = e;
							}
							Reflect.construct(e, [], n);
						} else {
							try {
								n.call();
							} catch (e) {
								r = e;
							}
							n = !1;
							try {
								var i = Object.getOwnPropertyDescriptor(e.prototype, "props");
								Object.defineProperty(e.prototype, "props", {
									configurable: !0,
									set: function() {
										throw Error();
									}
								}), n = !0, new e();
							} finally {
								n && (i === void 0 ? delete e.prototype.props : Object.defineProperty(e.prototype, "props", i));
							}
						}
					} else {
						try {
							throw Error();
						} catch (e) {
							r = e;
						}
						(n = e()) && typeof n.catch == "function" && n.catch(function() {});
					}
				} catch (e) {
					if (e && r && typeof e.stack == "string") return [e.stack, r.stack];
				}
				return [null, null];
			} };
			r.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
			var i = Object.getOwnPropertyDescriptor(r.DetermineComponentFrameRoot, "name");
			i && i.configurable && Object.defineProperty(r.DetermineComponentFrameRoot, "name", { value: "DetermineComponentFrameRoot" });
			var a = r.DetermineComponentFrameRoot(), o = a[0], s = a[1];
			if (o && s) {
				var c = o.split("\n"), l = s.split("\n");
				for (i = r = 0; r < c.length && !c[r].includes("DetermineComponentFrameRoot");) r++;
				for (; i < l.length && !l[i].includes("DetermineComponentFrameRoot");) i++;
				if (r === c.length || i === l.length) for (r = c.length - 1, i = l.length - 1; 1 <= r && 0 <= i && c[r] !== l[i];) i--;
				for (; 1 <= r && 0 <= i; r--, i--) if (c[r] !== l[i]) {
					if (r !== 1 || i !== 1) do
						if (r--, i--, 0 > i || c[r] !== l[i]) {
							var u = "\n" + c[r].replace(" at new ", " at ");
							return e.displayName && u.includes("<anonymous>") && (u = u.replace("<anonymous>", e.displayName)), u;
						}
					while (1 <= r && 0 <= i);
					break;
				}
			}
		} finally {
			Pe = !1, Error.prepareStackTrace = n;
		}
		return (n = e ? e.displayName || e.name : "") ? Ne(n) : "";
	}
	function Ie(e, t) {
		switch (e.tag) {
			case 26:
			case 27:
			case 5: return Ne(e.type);
			case 16: return Ne("Lazy");
			case 13: return e.child !== t && t !== null ? Ne("Suspense Fallback") : Ne("Suspense");
			case 19: return Ne("SuspenseList");
			case 0:
			case 15: return Fe(e.type, !1);
			case 11: return Fe(e.type.render, !1);
			case 1: return Fe(e.type, !0);
			case 31: return Ne("Activity");
			case 30: return Ne("ViewTransition");
			default: return "";
		}
	}
	function Le(e) {
		try {
			var t = "", n = null;
			do
				t += Ie(e, n), n = e, e = e.return;
			while (e);
			return t;
		} catch (e) {
			return "\nError generating stack: " + e.message + "\n" + e.stack;
		}
	}
	var Re = Object.prototype.hasOwnProperty, I = t.unstable_scheduleCallback, ze = t.unstable_cancelCallback, Be = t.unstable_shouldYield, Ve = t.unstable_requestPaint, He = t.unstable_now, Ue = t.unstable_getCurrentPriorityLevel, We = t.unstable_ImmediatePriority, Ge = t.unstable_UserBlockingPriority, Ke = t.unstable_NormalPriority, qe = t.unstable_LowPriority, Je = t.unstable_IdlePriority, Ye = t.log, Xe = t.unstable_setDisableYieldValue, Ze = null, Qe = null;
	function $e(e) {
		if (typeof Ye == "function" && Xe(e), Qe && typeof Qe.setStrictMode == "function") try {
			Qe.setStrictMode(Ze, e);
		} catch {}
	}
	var et = Math.clz32 ? Math.clz32 : rt, tt = Math.log, nt = Math.LN2;
	function rt(e) {
		return e >>>= 0, e === 0 ? 32 : 31 - (tt(e) / nt | 0) | 0;
	}
	var it = 256, at = 262144, ot = 4194304;
	function st(e) {
		var t = e & 42;
		if (t !== 0) return t;
		switch (e & -e) {
			case 1: return 1;
			case 2: return 2;
			case 4: return 4;
			case 8: return 8;
			case 16: return 16;
			case 32: return 32;
			case 64: return 64;
			case 128: return 128;
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072: return e & -e;
			case 262144:
			case 524288:
			case 1048576:
			case 2097152: return e & 3932160;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432: return e & 62914560;
			case 67108864: return 67108864;
			case 134217728: return 134217728;
			case 268435456: return 268435456;
			case 536870912: return 536870912;
			case 1073741824: return 0;
			default: return e;
		}
	}
	function ct(e, t, n) {
		var r = e.pendingLanes;
		if (r === 0) return 0;
		var i = 0, a = e.suspendedLanes, o = e.pingedLanes;
		e = e.warmLanes;
		var s = r & 134217727;
		return s === 0 ? (s = r & ~a, s === 0 ? o === 0 ? n || (n = r & ~e, n !== 0 && (i = st(n))) : i = st(o) : i = st(s)) : (r = s & ~a, r === 0 ? (o &= s, o === 0 ? n || (n = s & ~e, n !== 0 && (i = st(n))) : i = st(o)) : i = st(r)), i === 0 ? 0 : t !== 0 && t !== i && (t & a) === 0 && (a = i & -i, n = t & -t, a >= n || a === 32 && n & 4194048) ? t : i;
	}
	function lt(e, t) {
		return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0;
	}
	function ut(e, t) {
		t & 8 && (t |= t & 32);
		var n = e.entangledLanes;
		if (n !== 0) for (e = e.entanglements, n &= t; 0 < n;) {
			var r = 31 - et(n), i = 1 << r;
			t |= e[r], n &= ~i;
		}
		return t;
	}
	function dt(e, t) {
		switch (e) {
			case 1:
			case 2:
			case 4:
			case 8:
			case 64: return t + 250;
			case 16:
			case 32:
			case 128:
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152: return t + 5e3;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432: return -1;
			case 67108864:
			case 134217728:
			case 268435456:
			case 536870912:
			case 1073741824: return -1;
			default: return -1;
		}
	}
	function ft() {
		var e = ot;
		return ot <<= 1, !(ot & 62914560) && (ot = 4194304), e;
	}
	function pt(e) {
		for (var t = [], n = 0; 31 > n; n++) t.push(e);
		return t;
	}
	function mt(e, t) {
		e.pendingLanes |= t, t !== 268435456 && (e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0);
	}
	function ht(e, t, n, r, i, a) {
		var o = e.pendingLanes;
		e.pendingLanes = n, e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0, e.expiredLanes &= n, e.entangledLanes &= n, e.errorRecoveryDisabledLanes &= n, e.shellSuspendCounter = 0;
		var s = e.entanglements, c = e.expirationTimes, l = e.hiddenUpdates;
		for (n = o & ~n; 0 < n;) {
			var u = 31 - et(n), d = 1 << u;
			s[u] = 0, c[u] = -1;
			var f = l[u];
			if (f !== null) for (l[u] = null, u = 0; u < f.length; u++) {
				var p = f[u];
				p !== null && (p.lane &= -536870913);
			}
			n &= ~d;
		}
		r !== 0 && gt(e, r, 0), a !== 0 && i === 0 && e.tag !== 0 && (e.suspendedLanes |= a & ~(o & ~t));
	}
	function gt(e, t, n) {
		e.pendingLanes |= t, e.suspendedLanes &= ~t;
		var r = 31 - et(t);
		e.entangledLanes |= t, e.entanglements[r] = e.entanglements[r] | 1073741824 | n & 261930;
	}
	function _t(e, t) {
		var n = e.entangledLanes |= t;
		for (e = e.entanglements; n;) {
			var r = 31 - et(n), i = 1 << r;
			i & t | e[r] & t && (e[r] |= t), n &= ~i;
		}
	}
	function vt(e, t) {
		var n = t & -t;
		return n = n & 42 ? 1 : yt(n), (n & (e.suspendedLanes | t)) === 0 ? n : 0;
	}
	function yt(e) {
		switch (e) {
			case 2:
				e = 1;
				break;
			case 8:
				e = 4;
				break;
			case 32:
				e = 16;
				break;
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152:
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432:
				e = 128;
				break;
			case 268435456:
				e = 134217728;
				break;
			default: e = 0;
		}
		return e;
	}
	function bt(e) {
		return e &= -e, 2 < e ? 8 < e ? e & 134217727 ? 32 : 268435456 : 8 : 2;
	}
	function xt() {
		var e = P.p;
		return e === 0 ? (e = window.event, e === void 0 ? 32 : Ch(e.type)) : e;
	}
	function St(e, t) {
		var n = P.p;
		try {
			return P.p = e, t();
		} finally {
			P.p = n;
		}
	}
	var Ct = Math.random().toString(36).slice(2), wt = "__reactFiber$" + Ct, Tt = "__reactProps$" + Ct, Et = "__reactContainer$" + Ct, Dt = "__reactEvents$" + Ct, Ot = "__reactListeners$" + Ct, kt = "__reactHandles$" + Ct, At = "__reactResources$" + Ct, jt = "__reactMarker$" + Ct, Mt = "__reactLoad$" + Ct;
	function Nt(e) {
		delete e[wt], delete e[Tt], delete e[Ot], delete e[kt];
	}
	function Pt(e) {
		var t;
		if (t = e[wt]) return t;
		for (var n = e.parentNode; n;) {
			if (t = n[Et] || n[wt]) {
				if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = fm(e); e !== null;) {
					if (n = e[wt]) return n;
					e = fm(e);
				}
				return t;
			}
			e = n, n = e.parentNode;
		}
		return null;
	}
	function Ft(e) {
		if (e = e[wt] || e[Et]) {
			var t = e.tag;
			if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3) return e;
		}
		return null;
	}
	function It(e) {
		var t = e.tag;
		if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode;
		throw Error(s(33));
	}
	function Lt(e) {
		var t = e[At];
		return t || (t = e[At] = {
			hoistableStyles: /* @__PURE__ */ new Map(),
			hoistableScripts: /* @__PURE__ */ new Map()
		}), t;
	}
	function Rt(e) {
		e[jt] = !0;
	}
	function zt(e) {
		e[Mt] = void 0;
	}
	var Bt = /* @__PURE__ */ new Set(), Vt = {};
	function Ht(e, t) {
		Ut(e, t), Ut(e + "Capture", t);
	}
	function Ut(e, t) {
		for (Vt[e] = t, e = 0; e < t.length; e++) Bt.add(t[e]);
	}
	var Wt = RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"), Gt = {}, Kt = {};
	function qt(e) {
		return Re.call(Kt, e) ? !0 : Re.call(Gt, e) ? !1 : Wt.test(e) ? Kt[e] = !0 : (Gt[e] = !0, !1);
	}
	var L = !1;
	function Jt() {
		var e = L;
		return L = !1, e;
	}
	function Yt(e, t, n) {
		if (qt(t)) {
			if (n === null) e.removeAttribute(t);
			else {
				switch (typeof n) {
					case "undefined":
					case "function":
					case "symbol":
						e.removeAttribute(t);
						return;
					case "boolean":
						var r = t.toLowerCase().slice(0, 5);
						if (r !== "data-" && r !== "aria-") {
							e.removeAttribute(t);
							return;
						}
				}
				e.setAttribute(t, n);
			}
		}
	}
	function Xt(e, t, n) {
		if (n === null) e.removeAttribute(t);
		else {
			switch (typeof n) {
				case "undefined":
				case "function":
				case "symbol":
				case "boolean":
					e.removeAttribute(t);
					return;
			}
			e.setAttribute(t, n);
		}
	}
	function Zt(e, t, n, r) {
		if (r === null) e.removeAttribute(n);
		else {
			switch (typeof r) {
				case "undefined":
				case "function":
				case "symbol":
				case "boolean":
					e.removeAttribute(n);
					return;
			}
			e.setAttributeNS(t, n, r);
		}
	}
	function Qt(e) {
		switch (typeof e) {
			case "bigint":
			case "boolean":
			case "number":
			case "string":
			case "undefined": return e;
			case "object": return e;
			default: return "";
		}
	}
	function $t(e) {
		var t = e.type;
		return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
	}
	function en(e, t, n) {
		var r = Object.getOwnPropertyDescriptor(e.constructor.prototype, t);
		if (!e.hasOwnProperty(t) && r !== void 0 && typeof r.get == "function" && typeof r.set == "function") {
			var i = r.get, a = r.set;
			return Object.defineProperty(e, t, {
				configurable: !0,
				get: function() {
					return i.call(this);
				},
				set: function(e) {
					n = "" + e, a.call(this, e);
				}
			}), Object.defineProperty(e, t, { enumerable: r.enumerable }), {
				getValue: function() {
					return n;
				},
				setValue: function(e) {
					n = "" + e;
				},
				stopTracking: function() {
					e._valueTracker = null, delete e[t];
				}
			};
		}
	}
	function tn(e) {
		if (!e._valueTracker) {
			var t = $t(e) ? "checked" : "value";
			e._valueTracker = en(e, t, "" + e[t]);
		}
	}
	function nn(e) {
		if (!e) return !1;
		var t = e._valueTracker;
		if (!t) return !0;
		var n = t.getValue(), r = "";
		return e && (r = $t(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n && (t.setValue(e), !0);
	}
	var rn = /[\n"\\]/g;
	function an(e) {
		return e.replace(rn, function(e) {
			return "\\" + e.charCodeAt(0).toString(16) + " ";
		});
	}
	function on(e, t, n, r, i, a, o, s) {
		e.name = "", o != null && typeof o != "function" && typeof o != "symbol" && typeof o != "boolean" ? e.type = o : e.removeAttribute("type"), t == null ? o !== "submit" && o !== "reset" || e.removeAttribute("value") : o === "number" ? (t === 0 && e.value === "" || e.value != t) && (e.value = "" + Qt(t)) : e.value !== "" + Qt(t) && (e.value = "" + Qt(t)), t == null ? n == null ? r != null && e.removeAttribute("value") : cn(e, Qt(n)) : o === "number" && e.value == t ? cn(e, Qt(e.value)) : cn(e, Qt(t)), i == null && a != null && (e.defaultChecked = !!a), i != null && (e.checked = i && typeof i != "function" && typeof i != "symbol"), s != null && typeof s != "function" && typeof s != "symbol" && typeof s != "boolean" ? e.name = "" + Qt(s) : e.removeAttribute("name");
	}
	function sn(e, t, n, r, i, a, o, s) {
		if (a != null && typeof a != "function" && typeof a != "symbol" && typeof a != "boolean" && (e.type = a), t != null || n != null) {
			if (!(a !== "submit" && a !== "reset" || t != null)) {
				tn(e);
				return;
			}
			n = n == null ? "" : "" + Qt(n), t = t == null ? n : "" + Qt(t), s || t === e.value || (e.value = t), e.defaultValue = t;
		}
		r = r ?? i, r = typeof r != "function" && typeof r != "symbol" && !!r, e.checked = s ? e.checked : !!r, e.defaultChecked = !!r, o != null && typeof o != "function" && typeof o != "symbol" && typeof o != "boolean" && (e.name = o), tn(e);
	}
	function cn(e, t) {
		e.defaultValue !== "" + t && (e.defaultValue = "" + t);
	}
	function ln(e, t, n, r) {
		if (e = e.options, t) {
			t = {};
			for (var i = 0; i < n.length; i++) t["$" + n[i]] = !0;
			for (n = 0; n < e.length; n++) i = t.hasOwnProperty("$" + e[n].value), e[n].selected !== i && (e[n].selected = i), i && r && (e[n].defaultSelected = !0);
		} else {
			for (n = "" + Qt(n), t = null, i = 0; i < e.length; i++) {
				if (e[i].value === n) {
					e[i].selected = !0, r && (e[i].defaultSelected = !0);
					return;
				}
				t !== null || e[i].disabled || (t = e[i]);
			}
			t !== null && (t.selected = !0);
		}
	}
	function un(e, t, n) {
		t != null && (t = "" + Qt(t), t !== e.value && (e.value = t), n == null) ? e.defaultValue !== t && (e.defaultValue = t) : e.defaultValue = n == null ? "" : "" + Qt(n);
	}
	function dn(e, t, n, r) {
		if (t == null) {
			if (r != null) {
				if (n != null) throw Error(s(92));
				if (_e(r)) {
					if (1 < r.length) throw Error(s(93));
					r = r[0];
				}
				n = r;
			}
			n ?? (n = ""), t = n;
		}
		n = Qt(t), e.defaultValue = n, r = e.textContent, r === n && r !== "" && r !== null && (e.value = r), tn(e);
	}
	function fn(e, t) {
		if (t) {
			var n = e.firstChild;
			if (n && n === e.lastChild && n.nodeType === 3) {
				n.nodeValue = t;
				return;
			}
		}
		e.textContent = t;
	}
	var pn = new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));
	function mn(e, t, n) {
		var r = t.indexOf("--") === 0;
		n == null || typeof n == "boolean" || n === "" ? r ? e.setProperty(t, "") : t === "float" ? e.cssFloat = "" : e[t] = "" : r ? e.setProperty(t, n) : typeof n != "number" || n === 0 || pn.has(t) ? t === "float" ? e.cssFloat = n : e[t] = ("" + n).trim() : e[t] = n + "px";
	}
	function hn(e, t, n) {
		if (t != null && typeof t != "object") throw Error(s(62));
		if (e = e.style, n != null) {
			for (var r in n) !n.hasOwnProperty(r) || t != null && t.hasOwnProperty(r) || (r.indexOf("--") === 0 ? e.setProperty(r, "") : r === "float" ? e.cssFloat = "" : e[r] = "", L = !0);
			for (var i in t) r = t[i], t.hasOwnProperty(i) && n[i] !== r && (mn(e, i, r), L = !0);
		} else for (var a in t) t.hasOwnProperty(a) && mn(e, a, t[a]);
	}
	function gn(e) {
		if (e.indexOf("-") === -1) return !1;
		switch (e) {
			case "annotation-xml":
			case "color-profile":
			case "font-face":
			case "font-face-src":
			case "font-face-uri":
			case "font-face-format":
			case "font-face-name":
			case "missing-glyph": return !1;
			default: return !0;
		}
	}
	var _n = /* @__PURE__ */ new Map([
		["acceptCharset", "accept-charset"],
		["htmlFor", "for"],
		["httpEquiv", "http-equiv"],
		["crossOrigin", "crossorigin"],
		["accentHeight", "accent-height"],
		["alignmentBaseline", "alignment-baseline"],
		["arabicForm", "arabic-form"],
		["baselineShift", "baseline-shift"],
		["capHeight", "cap-height"],
		["clipPath", "clip-path"],
		["clipRule", "clip-rule"],
		["colorInterpolation", "color-interpolation"],
		["colorInterpolationFilters", "color-interpolation-filters"],
		["colorProfile", "color-profile"],
		["colorRendering", "color-rendering"],
		["dominantBaseline", "dominant-baseline"],
		["enableBackground", "enable-background"],
		["fillOpacity", "fill-opacity"],
		["fillRule", "fill-rule"],
		["floodColor", "flood-color"],
		["floodOpacity", "flood-opacity"],
		["fontFamily", "font-family"],
		["fontSize", "font-size"],
		["fontSizeAdjust", "font-size-adjust"],
		["fontStretch", "font-stretch"],
		["fontStyle", "font-style"],
		["fontVariant", "font-variant"],
		["fontWeight", "font-weight"],
		["glyphName", "glyph-name"],
		["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
		["glyphOrientationVertical", "glyph-orientation-vertical"],
		["horizAdvX", "horiz-adv-x"],
		["horizOriginX", "horiz-origin-x"],
		["imageRendering", "image-rendering"],
		["letterSpacing", "letter-spacing"],
		["lightingColor", "lighting-color"],
		["markerEnd", "marker-end"],
		["markerMid", "marker-mid"],
		["markerStart", "marker-start"],
		["maskType", "mask-type"],
		["overlinePosition", "overline-position"],
		["overlineThickness", "overline-thickness"],
		["paintOrder", "paint-order"],
		["panose-1", "panose-1"],
		["pointerEvents", "pointer-events"],
		["renderingIntent", "rendering-intent"],
		["shapeRendering", "shape-rendering"],
		["stopColor", "stop-color"],
		["stopOpacity", "stop-opacity"],
		["strikethroughPosition", "strikethrough-position"],
		["strikethroughThickness", "strikethrough-thickness"],
		["strokeDasharray", "stroke-dasharray"],
		["strokeDashoffset", "stroke-dashoffset"],
		["strokeLinecap", "stroke-linecap"],
		["strokeLinejoin", "stroke-linejoin"],
		["strokeMiterlimit", "stroke-miterlimit"],
		["strokeOpacity", "stroke-opacity"],
		["strokeWidth", "stroke-width"],
		["textAnchor", "text-anchor"],
		["textDecoration", "text-decoration"],
		["textRendering", "text-rendering"],
		["transformOrigin", "transform-origin"],
		["underlinePosition", "underline-position"],
		["underlineThickness", "underline-thickness"],
		["unicodeBidi", "unicode-bidi"],
		["unicodeRange", "unicode-range"],
		["unitsPerEm", "units-per-em"],
		["vAlphabetic", "v-alphabetic"],
		["vHanging", "v-hanging"],
		["vIdeographic", "v-ideographic"],
		["vMathematical", "v-mathematical"],
		["vectorEffect", "vector-effect"],
		["vertAdvY", "vert-adv-y"],
		["vertOriginX", "vert-origin-x"],
		["vertOriginY", "vert-origin-y"],
		["wordSpacing", "word-spacing"],
		["writingMode", "writing-mode"],
		["xmlnsXlink", "xmlns:xlink"],
		["xHeight", "x-height"]
	]), vn = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
	function yn(e) {
		return vn.test("" + e) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : e;
	}
	function bn() {}
	var xn = null;
	function Sn(e) {
		return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
	}
	var Cn = null, wn = null;
	function Tn(e) {
		var t = Ft(e);
		if (t && (e = t.stateNode)) {
			var n = e[Tt] || null;
			a: switch (e = t.stateNode, t.type) {
				case "input":
					if (on(e, n.value, n.defaultValue, n.defaultValue, n.checked, n.defaultChecked, n.type, n.name), t = n.name, n.type === "radio" && t != null) {
						for (n = e; n.parentNode;) n = n.parentNode;
						for (n = n.querySelectorAll("input[name=\"" + an("" + t) + "\"][type=\"radio\"]"), t = 0; t < n.length; t++) {
							var r = n[t];
							if (r !== e && r.form === e.form) {
								var i = r[Tt] || null;
								if (!i) throw Error(s(90));
								on(r, i.value, i.defaultValue, i.defaultValue, i.checked, i.defaultChecked, i.type, i.name);
							}
						}
						for (t = 0; t < n.length; t++) r = n[t], r.form === e.form && nn(r);
					}
					break a;
				case "textarea":
					un(e, n.value, n.defaultValue);
					break a;
				case "select": t = n.value, t != null && ln(e, !!n.multiple, t, !1);
			}
		}
	}
	var En = !1;
	function Dn(e, t, n) {
		if (En) return e(t, n);
		En = !0;
		try {
			return e(t);
		} finally {
			if (En = !1, (Cn !== null || wn !== null) && (zd(), Cn && (t = Cn, e = wn, wn = Cn = null, Tn(t), e))) for (t = 0; t < e.length; t++) Tn(e[t]);
		}
	}
	function On(e, t) {
		var n = e.stateNode;
		if (n === null) return null;
		var r = n[Tt] || null;
		if (r === null) return null;
		n = r[t];
		a: switch (t) {
			case "onClick":
			case "onClickCapture":
			case "onDoubleClick":
			case "onDoubleClickCapture":
			case "onMouseDown":
			case "onMouseDownCapture":
			case "onMouseMove":
			case "onMouseMoveCapture":
			case "onMouseUp":
			case "onMouseUpCapture":
			case "onMouseEnter":
				(r = !r.disabled) || (e = e.type, r = e !== "button" && e !== "input" && e !== "select" && e !== "textarea"), e = !r;
				break a;
			default: e = !1;
		}
		if (e) return null;
		if (n && typeof n != "function") throw Error(s(231, t, typeof n));
		return n;
	}
	var kn = typeof window < "u" && window.document !== void 0 && window.document.createElement !== void 0, An = !1;
	if (kn) try {
		var jn = {};
		Object.defineProperty(jn, "passive", { get: function() {
			An = !0;
		} }), window.addEventListener("test", jn, jn), window.removeEventListener("test", jn, jn);
	} catch {
		An = !1;
	}
	var Mn = null, Nn = null, Pn = null;
	function Fn() {
		if (Pn) return Pn;
		var e, t = Nn, n = t.length, r, i = "value" in Mn ? Mn.value : Mn.textContent, a = i.length;
		for (e = 0; e < n && t[e] === i[e]; e++);
		var o = n - e;
		for (r = 1; r <= o && t[n - r] === i[a - r]; r++);
		return Pn = i.slice(e, 1 < r ? 1 - r : void 0);
	}
	function In(e) {
		var t = e.keyCode;
		return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
	}
	function Ln() {
		return !0;
	}
	function Rn() {
		return !1;
	}
	function zn(e) {
		function t(t, n, r, i, a) {
			for (var o in this._reactName = t, this._targetInst = r, this.type = n, this.nativeEvent = i, this.target = a, this.currentTarget = null, e) e.hasOwnProperty(o) && (t = e[o], this[o] = t ? t(i) : i[o]);
			return this.isDefaultPrevented = (i.defaultPrevented == null ? !1 === i.returnValue : i.defaultPrevented) ? Ln : Rn, this.isPropagationStopped = Rn, this;
		}
		return D(t.prototype, {
			preventDefault: function() {
				this.defaultPrevented = !0;
				var e = this.nativeEvent;
				e && (e.preventDefault ? e.preventDefault() : typeof e.returnValue != "unknown" && (e.returnValue = !1), this.isDefaultPrevented = Ln);
			},
			stopPropagation: function() {
				var e = this.nativeEvent;
				e && (e.stopPropagation ? e.stopPropagation() : typeof e.cancelBubble != "unknown" && (e.cancelBubble = !0), this.isPropagationStopped = Ln);
			},
			persist: function() {},
			isPersistent: Ln
		}), t;
	}
	var Bn = {
		eventPhase: 0,
		bubbles: 0,
		cancelable: 0,
		timeStamp: function(e) {
			return e.timeStamp || Date.now();
		},
		defaultPrevented: 0,
		isTrusted: 0
	}, Vn = zn(Bn), Hn = D({}, Bn, {
		view: 0,
		detail: 0
	}), Un = zn(Hn), Wn, Gn, Kn, qn = D({}, Hn, {
		screenX: 0,
		screenY: 0,
		clientX: 0,
		clientY: 0,
		pageX: 0,
		pageY: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		getModifierState: ir,
		button: 0,
		buttons: 0,
		relatedTarget: function(e) {
			return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
		},
		movementX: function(e) {
			return "movementX" in e ? e.movementX : (e !== Kn && (Kn && e.type === "mousemove" ? (Wn = e.screenX - Kn.screenX, Gn = e.screenY - Kn.screenY) : Gn = Wn = 0, Kn = e), Wn);
		},
		movementY: function(e) {
			return "movementY" in e ? e.movementY : Gn;
		}
	}), Jn = zn(qn), Yn = zn(D({}, qn, { dataTransfer: 0 })), Xn = zn(D({}, Hn, { relatedTarget: 0 })), Zn = zn(D({}, Bn, {
		animationName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	})), Qn = zn(D({}, Bn, { clipboardData: function(e) {
		return "clipboardData" in e ? e.clipboardData : window.clipboardData;
	} })), $n = zn(D({}, Bn, { data: 0 })), er = {
		Esc: "Escape",
		Spacebar: " ",
		Left: "ArrowLeft",
		Up: "ArrowUp",
		Right: "ArrowRight",
		Down: "ArrowDown",
		Del: "Delete",
		Win: "OS",
		Menu: "ContextMenu",
		Apps: "ContextMenu",
		Scroll: "ScrollLock",
		MozPrintableKey: "Unidentified"
	}, tr = {
		8: "Backspace",
		9: "Tab",
		12: "Clear",
		13: "Enter",
		16: "Shift",
		17: "Control",
		18: "Alt",
		19: "Pause",
		20: "CapsLock",
		27: "Escape",
		32: " ",
		33: "PageUp",
		34: "PageDown",
		35: "End",
		36: "Home",
		37: "ArrowLeft",
		38: "ArrowUp",
		39: "ArrowRight",
		40: "ArrowDown",
		45: "Insert",
		46: "Delete",
		112: "F1",
		113: "F2",
		114: "F3",
		115: "F4",
		116: "F5",
		117: "F6",
		118: "F7",
		119: "F8",
		120: "F9",
		121: "F10",
		122: "F11",
		123: "F12",
		144: "NumLock",
		145: "ScrollLock",
		224: "Meta"
	}, nr = {
		Alt: "altKey",
		Control: "ctrlKey",
		Meta: "metaKey",
		Shift: "shiftKey"
	};
	function rr(e) {
		var t = this.nativeEvent;
		return t.getModifierState ? t.getModifierState(e) : (e = nr[e]) ? !!t[e] : !1;
	}
	function ir() {
		return rr;
	}
	var ar = zn(D({}, Hn, {
		key: function(e) {
			if (e.key) {
				var t = er[e.key] || e.key;
				if (t !== "Unidentified") return t;
			}
			return e.type === "keypress" ? (e = In(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? tr[e.keyCode] || "Unidentified" : "";
		},
		code: 0,
		location: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		repeat: 0,
		locale: 0,
		getModifierState: ir,
		charCode: function(e) {
			return e.type === "keypress" ? In(e) : 0;
		},
		keyCode: function(e) {
			return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		},
		which: function(e) {
			return e.type === "keypress" ? In(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		}
	})), or = zn(D({}, qn, {
		pointerId: 0,
		width: 0,
		height: 0,
		pressure: 0,
		tangentialPressure: 0,
		tiltX: 0,
		tiltY: 0,
		twist: 0,
		pointerType: 0,
		isPrimary: 0
	})), sr = zn(D({}, Bn, { submitter: 0 })), cr = zn(D({}, Hn, {
		touches: 0,
		targetTouches: 0,
		changedTouches: 0,
		altKey: 0,
		metaKey: 0,
		ctrlKey: 0,
		shiftKey: 0,
		getModifierState: ir
	})), lr = zn(D({}, Bn, {
		propertyName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	})), ur = zn(D({}, qn, {
		deltaX: function(e) {
			return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
		},
		deltaY: function(e) {
			return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
		},
		deltaZ: 0,
		deltaMode: 0
	})), dr = zn(D({}, Bn, {
		newState: 0,
		oldState: 0,
		source: 0
	})), fr = [
		9,
		13,
		27,
		32
	], pr = kn && "CompositionEvent" in window, mr = null;
	kn && "documentMode" in document && (mr = document.documentMode);
	var hr = kn && "TextEvent" in window && !mr, gr = kn && (!pr || mr && 8 < mr && 11 >= mr), _r = " ", vr = !1;
	function yr(e, t) {
		switch (e) {
			case "keyup": return fr.indexOf(t.keyCode) !== -1;
			case "keydown": return t.keyCode !== 229;
			case "keypress":
			case "mousedown":
			case "focusout": return !0;
			default: return !1;
		}
	}
	function br(e) {
		return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
	}
	var xr = !1;
	function Sr(e, t) {
		switch (e) {
			case "compositionend": return br(t);
			case "keypress": return t.which === 32 ? (vr = !0, _r) : null;
			case "textInput": return e = t.data, e === _r && vr ? null : e;
			default: return null;
		}
	}
	function R(e, t) {
		if (xr) return e === "compositionend" || !pr && yr(e, t) ? (e = Fn(), Pn = Nn = Mn = null, xr = !1, e) : null;
		switch (e) {
			case "paste": return null;
			case "keypress":
				if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
					if (t.char && 1 < t.char.length) return t.char;
					if (t.which) return String.fromCharCode(t.which);
				}
				return null;
			case "compositionend": return gr && t.locale !== "ko" ? null : t.data;
			default: return null;
		}
	}
	var Cr = {
		color: !0,
		date: !0,
		datetime: !0,
		"datetime-local": !0,
		email: !0,
		month: !0,
		number: !0,
		password: !0,
		range: !0,
		search: !0,
		tel: !0,
		text: !0,
		time: !0,
		url: !0,
		week: !0
	};
	function wr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t === "input" ? !!Cr[e.type] : t === "textarea";
	}
	function Tr(e, t, n, r) {
		Cn ? wn ? wn.push(r) : wn = [r] : Cn = r, t = Jf(t, "onChange"), 0 < t.length && (n = new Vn("onChange", "change", null, n, r), e.push({
			event: n,
			listeners: t
		}));
	}
	var Er = null, Dr = null;
	function Or(e) {
		Vf(e, 0);
	}
	function kr(e) {
		if (nn(It(e))) return e;
	}
	function Ar(e, t) {
		if (e === "change") return t;
	}
	var jr = !1;
	if (kn) {
		var Mr;
		if (kn) {
			var Nr = "oninput" in document;
			if (!Nr) {
				var Pr = document.createElement("div");
				Pr.setAttribute("oninput", "return;"), Nr = typeof Pr.oninput == "function";
			}
			Mr = Nr;
		} else Mr = !1;
		jr = Mr && (!document.documentMode || 9 < document.documentMode);
	}
	function Fr() {
		Er && (Er.detachEvent("onpropertychange", Ir), Dr = Er = null);
	}
	function Ir(e) {
		if (e.propertyName === "value" && kr(Dr)) {
			var t = [];
			Tr(t, Dr, e, Sn(e)), Dn(Or, t);
		}
	}
	function Lr(e, t, n) {
		e === "focusin" ? (Fr(), Er = t, Dr = n, Er.attachEvent("onpropertychange", Ir)) : e === "focusout" && Fr();
	}
	function Rr(e) {
		if (e === "selectionchange" || e === "keyup" || e === "keydown") return kr(Dr);
	}
	function zr(e, t) {
		if (e === "click") return kr(t);
	}
	function Br(e, t) {
		if (e === "input" || e === "change") return kr(t);
	}
	function Vr(e, t) {
		return e === t && (e !== 0 || 1 / e == 1 / t) || e !== e && t !== t;
	}
	var Hr = typeof Object.is == "function" ? Object.is : Vr;
	function Ur(e, t) {
		if (Hr(e, t)) return !0;
		if (typeof e != "object" || !e || typeof t != "object" || !t) return !1;
		var n = Object.keys(e), r = Object.keys(t);
		if (n.length !== r.length) return !1;
		for (r = 0; r < n.length; r++) {
			var i = n[r];
			if (!Re.call(t, i) || !Hr(e[i], t[i])) return !1;
		}
		return !0;
	}
	function Wr(e) {
		if (e = e || (typeof document < "u" ? document : void 0), e === void 0) return null;
		try {
			return e.activeElement || e.body;
		} catch {
			return e.body;
		}
	}
	function Gr(e) {
		for (; e && e.firstChild;) e = e.firstChild;
		return e;
	}
	function Kr(e, t) {
		var n = Gr(e);
		e = 0;
		for (var r; n;) {
			if (n.nodeType === 3) {
				if (r = e + n.textContent.length, e <= t && r >= t) return {
					node: n,
					offset: t - e
				};
				e = r;
			}
			a: {
				for (; n;) {
					if (n.nextSibling) {
						n = n.nextSibling;
						break a;
					}
					n = n.parentNode;
				}
				n = void 0;
			}
			n = Gr(n);
		}
	}
	function qr(e, t) {
		return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? qr(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
	}
	function Jr(e) {
		e = e != null && e.ownerDocument != null && e.ownerDocument.defaultView != null ? e.ownerDocument.defaultView : window;
		for (var t = Wr(e.document); t instanceof e.HTMLIFrameElement;) {
			try {
				var n = typeof t.contentWindow.location.href == "string";
			} catch {
				n = !1;
			}
			if (n) e = t.contentWindow;
			else break;
			t = Wr(e.document);
		}
		return t;
	}
	function Yr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
	}
	var Xr = kn && "documentMode" in document && 11 >= document.documentMode, Zr = null, Qr = null, $r = null, ei = !1;
	function ti(e, t, n) {
		var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
		ei || Zr == null || Zr !== Wr(r) || (r = Zr, "selectionStart" in r && Yr(r) ? r = {
			start: r.selectionStart,
			end: r.selectionEnd
		} : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = {
			anchorNode: r.anchorNode,
			anchorOffset: r.anchorOffset,
			focusNode: r.focusNode,
			focusOffset: r.focusOffset
		}), $r && Ur($r, r) || ($r = r, r = Jf(Qr, "onSelect"), 0 < r.length && (t = new Vn("onSelect", "select", null, t, n), e.push({
			event: t,
			listeners: r
		}), t.target = Zr)));
	}
	function ni(e, t) {
		var n = {};
		return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
	}
	var ri = {
		animationend: ni("Animation", "AnimationEnd"),
		animationiteration: ni("Animation", "AnimationIteration"),
		animationstart: ni("Animation", "AnimationStart"),
		transitionrun: ni("Transition", "TransitionRun"),
		transitionstart: ni("Transition", "TransitionStart"),
		transitioncancel: ni("Transition", "TransitionCancel"),
		transitionend: ni("Transition", "TransitionEnd")
	}, ii = {}, ai = {};
	kn && (ai = document.createElement("div").style, "AnimationEvent" in window || (delete ri.animationend.animation, delete ri.animationiteration.animation, delete ri.animationstart.animation), "TransitionEvent" in window || delete ri.transitionend.transition);
	function oi(e) {
		if (ii[e]) return ii[e];
		if (!ri[e]) return e;
		var t = ri[e], n;
		for (n in t) if (t.hasOwnProperty(n) && n in ai) return ii[e] = t[n];
		return e;
	}
	var si = oi("animationend"), ci = oi("animationiteration"), li = oi("animationstart"), ui = oi("transitionrun"), di = oi("transitionstart"), fi = oi("transitioncancel"), pi = oi("transitionend"), mi = /* @__PURE__ */ new Map(), hi = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
	hi.push("scrollEnd");
	function gi(e, t) {
		mi.set(e, t), Ht(t, [e]);
	}
	var _i = 0;
	function vi(e, t) {
		if (e.name != null && e.name !== "auto") return e.name;
		if (t.autoName !== null) return t.autoName;
		e = bd.identifierPrefix;
		var n = _i++;
		return e = "_" + e + "t_" + n.toString(32) + "_", t.autoName = e;
	}
	function yi(e) {
		if (e == null || typeof e == "string") return e;
		var t = null, n = Od;
		if (n !== null) for (var r = 0; r < n.length; r++) {
			var i = e[n[r]];
			if (i != null) {
				if (i === "none") return "none";
				t = t == null ? i : t + (" " + i);
			}
		}
		return t ?? e.default;
	}
	function bi(e, t) {
		return e = yi(e), t = yi(t), t == null ? e === "auto" ? null : e : t === "auto" ? null : t;
	}
	var xi = typeof reportError == "function" ? reportError : function(e) {
		if (typeof window == "object" && typeof window.ErrorEvent == "function") {
			var t = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: typeof e == "object" && e && typeof e.message == "string" ? String(e.message) : String(e),
				error: e
			});
			if (!window.dispatchEvent(t)) return;
		} else if (typeof process == "object" && typeof process.emit == "function") {
			process.emit("uncaughtException", e);
			return;
		}
		console.error(e);
	}, Si = [], Ci = 0, wi = 0;
	function Ti() {
		for (var e = Ci, t = wi = Ci = 0; t < e;) {
			var n = Si[t];
			Si[t++] = null;
			var r = Si[t];
			Si[t++] = null;
			var i = Si[t];
			Si[t++] = null;
			var a = Si[t];
			if (Si[t++] = null, r !== null && i !== null) {
				var o = r.pending;
				o === null ? i.next = i : (i.next = o.next, o.next = i), r.pending = i;
			}
			a !== 0 && ki(n, i, a);
		}
	}
	function Ei(e, t, n, r) {
		Si[Ci++] = e, Si[Ci++] = t, Si[Ci++] = n, Si[Ci++] = r, wi |= r, e.lanes |= r, e = e.alternate, e !== null && (e.lanes |= r);
	}
	function Di(e, t, n, r) {
		return Ei(e, t, n, r), Ai(e);
	}
	function Oi(e, t) {
		return Ei(e, null, null, t), Ai(e);
	}
	function ki(e, t, n) {
		e.lanes |= n;
		var r = e.alternate;
		r !== null && (r.lanes |= n);
		for (var i = !1, a = e.return; a !== null;) a.childLanes |= n, r = a.alternate, r !== null && (r.childLanes |= n), a.tag === 22 && (e = a.stateNode, e === null || e._visibility & 1 || (i = !0)), e = a, a = a.return;
		return e.tag === 3 ? (a = e.stateNode, i && t !== null && (i = 31 - et(n), e = a.hiddenUpdates, r = e[i], r === null ? e[i] = [t] : r.push(t), t.lane = n | 536870912), a) : null;
	}
	function Ai(e) {
		if (50 < kd) throw kd = 0, Ad = null, Error(s(185));
		for (var t = e.return; t !== null;) e = t, t = e.return;
		return e.tag === 3 ? e.stateNode : null;
	}
	var ji = {};
	function Mi(e, t, n, r) {
		this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
	}
	function Ni(e, t, n, r) {
		return new Mi(e, t, n, r);
	}
	function Pi(e) {
		return e = e.prototype, !(!e || !e.isReactComponent);
	}
	function Fi(e, t) {
		var n = e.alternate;
		return n === null ? (n = Ni(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 1206910976, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : {
			lanes: t.lanes,
			firstContext: t.firstContext
		}, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n.refCleanup = e.refCleanup, n;
	}
	function Ii(e, t) {
		e.flags &= 1206910978;
		var n = e.alternate;
		return n === null ? (e.childLanes = 0, e.lanes = t, e.child = null, e.subtreeFlags = 0, e.memoizedProps = null, e.memoizedState = null, e.updateQueue = null, e.dependencies = null, e.stateNode = null) : (e.childLanes = n.childLanes, e.lanes = n.lanes, e.child = n.child, e.subtreeFlags = 0, e.deletions = null, e.memoizedProps = n.memoizedProps, e.memoizedState = n.memoizedState, e.updateQueue = n.updateQueue, e.type = n.type, t = n.dependencies, e.dependencies = t === null ? null : {
			lanes: t.lanes,
			firstContext: t.firstContext
		}), e;
	}
	function Li(e, t, n, r, i, a) {
		var o = 0;
		if (r = e, typeof r == "function") Pi(r) && (o = 1);
		else if (typeof r == "string") o = qm(e, n, Ce.current) ? 26 : e === "html" || e === "head" || e === "body" ? 27 : 5;
		else a: switch (r) {
			case ce: return e = Ni(31, n, t, i), e.elementType = ce, e.lanes = a, e;
			case A: return Ri(n.children, i, a, t);
			case te:
				o = 8, i |= 24;
				break;
			case ne: return e = Ni(12, n, t, i | 2), e.elementType = ne, e.lanes = a, e;
			case ie: return e = Ni(13, n, t, i), e.elementType = ie, e.lanes = a, e;
			case ae: return e = Ni(19, n, t, i), e.elementType = ae, e.lanes = a, e;
			case le:
			case de: return e = i | 32, e = Ni(30, n, t, e), e.elementType = de, e.lanes = a, e.stateNode = {
				autoName: null,
				paired: null,
				clones: null,
				ref: null
			}, e;
			default:
				if (typeof r == "object" && r) switch (r.$$typeof) {
					case M:
						o = 10;
						break a;
					case j:
						o = 9;
						break a;
					case re:
						o = 11;
						break a;
					case oe:
						o = 14;
						break a;
					case se:
						o = 16, r = null;
						break a;
				}
				o = 29, n = Error(s(130, e === null ? "null" : typeof e, "")), r = null;
		}
		return t = Ni(o, n, t, i), t.elementType = e, t.type = r, t.lanes = a, t;
	}
	function Ri(e, t, n, r) {
		return e = Ni(7, e, r, t), e.lanes = n, e;
	}
	function zi(e, t, n) {
		return e = Ni(6, e, null, t), e.lanes = n, e;
	}
	function Bi(e) {
		var t = Ni(18, null, null, 0);
		return t.stateNode = e, t;
	}
	function Vi(e, t, n) {
		return t = Ni(4, e.children === null ? [] : e.children, e.key, t), t.lanes = n, t.stateNode = {
			containerInfo: e.containerInfo,
			pendingChildren: null,
			implementation: e.implementation
		}, t;
	}
	var Hi = /* @__PURE__ */ new WeakMap();
	function Ui(e, t) {
		if (typeof e == "object" && e) {
			var n = Hi.get(e);
			return n === void 0 ? (t = {
				value: e,
				source: t,
				stack: Le(t)
			}, Hi.set(e, t), t) : n;
		}
		return {
			value: e,
			source: t,
			stack: Le(t)
		};
	}
	var Wi = [], Gi = 0, Ki = null, qi = 0, Ji = [], Yi = 0, Xi = null, Zi = 1, Qi = "";
	function $i(e, t) {
		Wi[Gi++] = qi, Wi[Gi++] = Ki, Ki = e, qi = t;
	}
	function ea(e, t, n) {
		Ji[Yi++] = Zi, Ji[Yi++] = Qi, Ji[Yi++] = Xi, Xi = e;
		var r = Zi;
		e = Qi;
		var i = 32 - et(r) - 1;
		r &= ~(1 << i), n += 1;
		var a = 32 - et(t) + i;
		if (30 < a) {
			var o = i - i % 5;
			a = (r & (1 << o) - 1).toString(32), r >>= o, i -= o, Zi = 1 << 32 - et(t) + i | n << i | r, Qi = a + e;
		} else Zi = 1 << a | n << i | r, Qi = e;
	}
	function ta(e) {
		e.return !== null && ($i(e, 1), ea(e, 1, 0));
	}
	function na(e) {
		for (; e === Ki;) Ki = Wi[--Gi], Wi[Gi] = null, qi = Wi[--Gi], Wi[Gi] = null;
		for (; e === Xi;) Xi = Ji[--Yi], Ji[Yi] = null, Qi = Ji[--Yi], Ji[Yi] = null, Zi = Ji[--Yi], Ji[Yi] = null;
	}
	function ra(e, t) {
		Ji[Yi++] = Zi, Ji[Yi++] = Qi, Ji[Yi++] = Xi, Zi = t.id, Qi = t.overflow, Xi = e;
	}
	var ia = null, z = null, B = !1, aa = null, oa = !1, sa = Error(s(519));
	function ca(e) {
		throw ma(Ui(Error(s(418, 1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML", "")), e)), sa;
	}
	function la(e) {
		var t = e.stateNode, n = e.type, r = e.memoizedProps;
		switch (t[wt] = e, t[Tt] = r, n) {
			case "dialog":
				Q("cancel", t), Q("close", t);
				break;
			case "iframe":
			case "object":
			case "embed":
				Q("load", t);
				break;
			case "video":
			case "audio":
				for (n = 0; n < zf.length; n++) Q(zf[n], t);
				break;
			case "source":
				Q("error", t);
				break;
			case "img":
			case "image":
			case "link":
				Q("error", t), Q("load", t);
				break;
			case "details":
				Q("toggle", t);
				break;
			case "input":
				Q("invalid", t), sn(t, r.value, r.defaultValue, r.checked, r.defaultChecked, r.type, r.name, !0);
				break;
			case "select":
				Q("invalid", t);
				break;
			case "textarea": Q("invalid", t), dn(t, r.value, r.defaultValue, r.children);
		}
		n = r.children, typeof n != "string" && typeof n != "number" && typeof n != "bigint" || t.textContent === "" + n || !0 === r.suppressHydrationWarning || ep(t.textContent, n) ? (r.popover != null && (Q("beforetoggle", t), Q("toggle", t)), r.onScroll != null && Q("scroll", t), r.onScrollEnd != null && Q("scrollend", t), r.onClick != null && (t.onclick = bn), t = !0) : t = !1, t || ca(e, !0);
	}
	function ua(e) {
		for (ia = e.return; ia;) switch (ia.tag) {
			case 5:
			case 31:
			case 13:
				oa = !1;
				return;
			case 27:
			case 3:
				oa = !0;
				return;
			default: ia = ia.return;
		}
	}
	function da(e) {
		if (e !== ia) return !1;
		if (!B) return ua(e), B = !0, !1;
		var t = e.tag, n;
		if ((n = t !== 3 && t !== 27) && ((n = t === 5) && (n = e.type, n = n === "form" || n === "button" || pp(e.type, e.memoizedProps)), n = !n), n && z && ca(e), ua(e), t === 13) {
			if (e = e.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(s(317));
			z = dm(e);
		} else if (t === 31) {
			if (e = e.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(s(317));
			z = dm(e);
		} else t === 27 ? (t = z, Sp(e.type) ? (e = um, um = null, z = e) : z = t) : z = ia ? lm(e.stateNode.nextSibling) : null;
		return !0;
	}
	function fa() {
		z = ia = null, B = !1;
	}
	function pa() {
		var e = aa;
		return e !== null && (fd === null ? fd = e : fd.push.apply(fd, e), aa = null), e;
	}
	function ma(e) {
		aa === null ? aa = [e] : aa.push(e);
	}
	var ha = xe(null), ga = null, _a = null;
	function va(e, t, n) {
		F(ha, t._currentValue), t._currentValue = n;
	}
	function ya(e) {
		e._currentValue = ha.current, Se(ha);
	}
	function ba(e, t, n) {
		for (; e !== null;) {
			var r = e.alternate;
			if ((e.childLanes & t) === t ? r !== null && (r.childLanes & t) !== t && (r.childLanes |= t) : (e.childLanes |= t, r !== null && (r.childLanes |= t)), e === n) break;
			e = e.return;
		}
	}
	function xa(e, t, n, r) {
		var i = e.child;
		for (i !== null && (i.return = e); i !== null;) {
			var a = i.dependencies;
			if (a !== null) {
				var o = i.child;
				a = a.firstContext;
				a: for (; a !== null;) {
					var c = a;
					a = i;
					for (var l = 0; l < t.length; l++) if (c.context === t[l]) {
						a.lanes |= n, c = a.alternate, c !== null && (c.lanes |= n), ba(a.return, n, e), r || (o = null);
						break a;
					}
					a = c.next;
				}
			} else if (i.tag === 18) {
				if (o = i.return, o === null) throw Error(s(341));
				o.lanes |= n, a = o.alternate, a !== null && (a.lanes |= n), ba(o, n, e), o = null;
			} else i.tag === 13 && i.memoizedState !== null && i.memoizedState.dehydrated === null ? (i.lanes |= n, o = i.alternate, o !== null && (o.lanes |= n), ba(i.return, n, e), o = i.child, o = o === null ? null : o.sibling) : o = i.child;
			if (o !== null) o.return = i;
			else for (o = i; o !== null;) {
				if (o === e) {
					o = null;
					break;
				}
				if (i = o.sibling, i !== null) {
					i.return = o.return, o = i;
					break;
				}
				o = o.return;
			}
			i = o;
		}
	}
	function Sa(e, t, n, r) {
		e = null;
		for (var i = t, a = !1; i !== null;) {
			if (!a) {
				if (i.flags & 524288) a = !0;
				else if (i.flags & 262144) break;
			}
			if (i.tag === 10) {
				var o = i.alternate;
				if (o === null) throw Error(s(387));
				if (o = o.memoizedProps, o !== null) {
					var c = i.type;
					Hr(i.pendingProps.value, o.value) || (e === null ? e = [c] : e.push(c));
				}
			} else if (i === Ee.current) {
				if (o = i.alternate, o === null) throw Error(s(387));
				o.memoizedState.memoizedState !== i.memoizedState.memoizedState && (e === null ? e = [sh] : e.push(sh));
			}
			i = i.return;
		}
		return e !== null && xa(t, e, n, r), t.flags |= 262144, e !== null;
	}
	function Ca(e) {
		for (e = e.firstContext; e !== null;) {
			if (!Hr(e.context._currentValue, e.memoizedValue)) return !0;
			e = e.next;
		}
		return !1;
	}
	function wa(e) {
		ga = e, _a = null, e = e.dependencies, e !== null && (e.firstContext = null);
	}
	function Ta(e) {
		return Da(ga, e);
	}
	function Ea(e, t) {
		return ga === null && wa(e), Da(e, t);
	}
	function Da(e, t) {
		var n = t._currentValue;
		if (t = {
			context: t,
			memoizedValue: n,
			next: null
		}, _a === null) {
			if (e === null) throw Error(s(308));
			_a = t, e.dependencies = {
				lanes: 0,
				firstContext: t
			}, e.flags |= 524288;
		} else _a = _a.next = t;
		return n;
	}
	var Oa = typeof AbortController < "u" ? AbortController : function() {
		var e = [], t = this.signal = {
			aborted: !1,
			addEventListener: function(t, n) {
				e.push(n);
			}
		};
		this.abort = function() {
			t.aborted = !0, e.forEach(function(e) {
				return e();
			});
		};
	}, ka = t.unstable_scheduleCallback, Aa = t.unstable_NormalPriority, ja = {
		$$typeof: M,
		Consumer: null,
		Provider: null,
		_currentValue: null,
		_currentValue2: null,
		_threadCount: 0
	};
	function Ma() {
		return {
			controller: new Oa(),
			data: /* @__PURE__ */ new Map(),
			refCount: 0
		};
	}
	function Na(e) {
		e.refCount--, e.refCount === 0 && ka(Aa, function() {
			e.controller.abort();
		});
	}
	function Pa(e, t) {
		if (e.pendingLanes & 4194048) {
			var n = e.transitionTypes;
			for (n === null && (n = e.transitionTypes = []), e = 0; e < t.length; e++) {
				var r = t[e];
				n.indexOf(r) === -1 && n.push(r);
			}
		}
	}
	var Fa = null;
	function Ia(e) {
		var t = e.transitionTypes;
		return e.transitionTypes = null, t;
	}
	var La = null, Ra = 0, za = 0, Ba = null;
	function Va(e, t) {
		if (La === null) {
			var n = La = [];
			Ra = 0, za = Pf(), Ba = {
				status: "pending",
				value: void 0,
				then: function(e) {
					n.push(e);
				}
			};
		}
		return Ra++, t.then(Ha, Ha), t;
	}
	function Ha() {
		if (--Ra === 0 && (Fa = null, La !== null)) {
			Ba !== null && (Ba.status = "fulfilled");
			var e = La;
			La = null, za = 0, Ba = null;
			for (var t = 0; t < e.length; t++) (0, e[t])();
		}
	}
	function Ua(e, t) {
		var n = [], r = {
			status: "pending",
			value: null,
			reason: null,
			then: function(e) {
				n.push(e);
			}
		};
		return e.then(function() {
			r.status = "fulfilled", r.value = t;
			for (var e = 0; e < n.length; e++) (0, n[e])(t);
		}, function(e) {
			for (r.status = "rejected", r.reason = e, e = 0; e < n.length; e++) (0, n[e])(void 0);
		}), r;
	}
	var Wa = N.S;
	N.S = function(e, t) {
		if (hd = He(), typeof t == "object" && t && typeof t.then == "function" && Va(e, t), Fa !== null) for (var n = bf; n !== null;) Pa(n, Fa), n = n.next;
		if (n = e.types, n !== null) {
			for (var r = bf; r !== null;) Pa(r, n), r = r.next;
			if (za !== 0) {
				r = Fa, r === null && (r = Fa = []);
				for (var i = 0; i < n.length; i++) {
					var a = n[i];
					r.indexOf(a) === -1 && r.push(a);
				}
			}
		}
		Wa !== null && Wa(e, t);
	};
	var Ga = xe(null);
	function Ka() {
		var e = Ga.current;
		return e === null ? q.pooledCache : e;
	}
	function qa(e, t) {
		t === null ? F(Ga, Ga.current) : F(Ga, t.pool);
	}
	function Ja() {
		var e = Ka();
		return e === null ? null : {
			parent: ja._currentValue,
			pool: e
		};
	}
	var Ya = Error(s(460)), Xa = Error(s(474)), Za = Error(s(542)), Qa = { then: function() {} };
	function $a(e) {
		return e = e.status, e === "fulfilled" || e === "rejected";
	}
	function eo(e, t, n) {
		switch (n = e[n], n === void 0 ? e.push(t) : n !== t && (t.then(bn, bn), t = n), t.status) {
			case "fulfilled": return t.value;
			case "rejected": throw e = t.reason, io(e), e === void 0 && !("reason" in t) ? Error(s(600)) : e;
			default:
				if (typeof t.status == "string") t.then(bn, bn);
				else {
					if (e = q, e !== null && 100 < e.shellSuspendCounter) throw Error(s(482));
					e = t, e.status = "pending", e.then(function(e) {
						if (t.status === "pending") {
							var n = t;
							n.status = "fulfilled", n.value = e;
						}
					}, function(e) {
						if (t.status === "pending") {
							var n = t;
							n.status = "rejected", n.reason = e;
						}
					});
				}
				switch (t.status) {
					case "fulfilled": return t.value;
					case "rejected": throw e = t.reason, io(e), e;
				}
				throw no = t, Ya;
		}
	}
	function to(e) {
		try {
			var t = e._init;
			return t(e._payload);
		} catch (e) {
			throw typeof e == "object" && e && typeof e.then == "function" ? (no = e, Ya) : e;
		}
	}
	var no = null;
	function ro() {
		if (no === null) throw Error(s(459));
		var e = no;
		return no = null, e;
	}
	function io(e) {
		if (e === Ya || e === Za) throw Error(s(483));
	}
	var ao = null, oo = 0;
	function so(e) {
		var t = oo;
		return oo += 1, ao === null && (ao = []), eo(ao, e, t);
	}
	function co(e, t) {
		t = t.props.ref, e.ref = t === void 0 ? null : t;
	}
	function lo(e, t) {
		throw t.$$typeof === O ? Error(s(525)) : (e = Object.prototype.toString.call(t), Error(s(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e)));
	}
	function uo(e) {
		function t(t, n) {
			if (e) {
				var r = t.deletions;
				r === null ? (t.deletions = [n], t.flags |= 16) : r.push(n);
			}
		}
		function n(n, r) {
			if (!e) return null;
			for (; r !== null;) t(n, r), r = r.sibling;
			return null;
		}
		function r(e) {
			for (var t = /* @__PURE__ */ new Map(); e !== null;) e.key === null ? t.set(e.index, e) : t.set(e.key, e), e = e.sibling;
			return t;
		}
		function i(e, t) {
			return e = Fi(e, t), e.index = 0, e.sibling = null, e;
		}
		function a(t, n, r) {
			return t.index = r, e ? (r = t.alternate, r === null ? (t.flags |= 134217730, n) : (r = r.index, r < n ? (t.flags |= 2, n) : r)) : (t.flags |= 1048576, n);
		}
		function o(t) {
			return e && t.alternate === null && (t.flags |= 134217730), t;
		}
		function c(e, t, n, r) {
			return t === null || t.tag !== 6 ? (t = zi(n, e.mode, r), t.return = e, t) : (t = i(t, n), t.return = e, t);
		}
		function l(e, t, n, r) {
			var a = n.type;
			return a === A ? (e = d(e, t, n.props.children, r, n.key), co(e, n), e) : t !== null && (t.elementType === a || typeof a == "object" && a && a.$$typeof === se && to(a) === t.type) ? (t = i(t, n.props), co(t, n), t.return = e, t) : (t = Li(n.type, n.key, n.props, null, e.mode, r), co(t, n), t.return = e, t);
		}
		function u(e, t, n, r) {
			return t === null || t.tag !== 4 || t.stateNode.containerInfo !== n.containerInfo || t.stateNode.implementation !== n.implementation ? (t = Vi(n, e.mode, r), t.return = e, t) : (t = i(t, n.children || []), t.return = e, t);
		}
		function d(e, t, n, r, a) {
			return t === null || t.tag !== 7 ? (t = Ri(n, e.mode, r, a), t.return = e, t) : (t = i(t, n), t.return = e, t);
		}
		function f(e, t, n) {
			if (typeof t == "string" && t !== "" || typeof t == "number" || typeof t == "bigint") return t = zi("" + t, e.mode, n), t.return = e, t;
			if (typeof t == "object" && t) {
				switch (t.$$typeof) {
					case k: return n = Li(t.type, t.key, t.props, null, e.mode, n), co(n, t), n.return = e, n;
					case ee: return t = Vi(t, e.mode, n), t.return = e, t;
					case se: return t = to(t), f(e, t, n);
				}
				if (_e(t) || me(t)) return t = Ri(t, e.mode, n, null), t.return = e, t;
				if (typeof t.then == "function") return f(e, so(t), n);
				if (t.$$typeof === M) return f(e, Ea(e, t), n);
				lo(e, t);
			}
			return null;
		}
		function p(e, t, n, r) {
			var i = t === null ? null : t.key;
			if (typeof n == "string" && n !== "" || typeof n == "number" || typeof n == "bigint") return i === null ? c(e, t, "" + n, r) : null;
			if (typeof n == "object" && n) {
				switch (n.$$typeof) {
					case k: return n.key === i ? l(e, t, n, r) : null;
					case ee: return n.key === i ? u(e, t, n, r) : null;
					case se: return n = to(n), p(e, t, n, r);
				}
				if (_e(n) || me(n)) return i === null ? d(e, t, n, r, null) : null;
				if (typeof n.then == "function") return p(e, t, so(n), r);
				if (n.$$typeof === M) return p(e, t, Ea(e, n), r);
				lo(e, n);
			}
			return null;
		}
		function m(e, t, n, r, i) {
			if (typeof r == "string" && r !== "" || typeof r == "number" || typeof r == "bigint") return e = e.get(n) || null, c(t, e, "" + r, i);
			if (typeof r == "object" && r) {
				switch (r.$$typeof) {
					case k: return e = e.get(r.key === null ? n : r.key) || null, l(t, e, r, i);
					case ee: return e = e.get(r.key === null ? n : r.key) || null, u(t, e, r, i);
					case se: return r = to(r), m(e, t, n, r, i);
				}
				if (_e(r) || me(r)) return e = e.get(n) || null, d(t, e, r, i, null);
				if (typeof r.then == "function") return m(e, t, n, so(r), i);
				if (r.$$typeof === M) return m(e, t, n, Ea(t, r), i);
				lo(t, r);
			}
			return null;
		}
		function h(i, o, s, c) {
			for (var l = null, u = null, d = o, h = o = 0, g = null; d !== null && h < s.length; h++) {
				d.index > h ? (g = d, d = null) : g = d.sibling;
				var _ = p(i, d, s[h], c);
				if (_ === null) {
					d === null && (d = g);
					break;
				}
				e && d && _.alternate === null && t(i, d), o = a(_, o, h), u === null ? l = _ : u.sibling = _, u = _, d = g;
			}
			if (h === s.length) return n(i, d), B && $i(i, h), l;
			if (d === null) {
				for (; h < s.length; h++) d = f(i, s[h], c), d !== null && (o = a(d, o, h), u === null ? l = d : u.sibling = d, u = d);
				return B && $i(i, h), l;
			}
			for (d = r(d); h < s.length; h++) g = m(d, i, h, s[h], c), g !== null && (e && (_ = g.alternate, _ !== null && d.delete(_.key === null ? h : _.key)), o = a(g, o, h), u === null ? l = g : u.sibling = g, u = g);
			return e && d.forEach(function(e) {
				return t(i, e);
			}), B && $i(i, h), l;
		}
		function g(i, o, c, l) {
			if (c == null) throw Error(s(151));
			for (var u = null, d = null, h = o, g = o = 0, _ = null, v = c.next(); h !== null && !v.done; g++, v = c.next()) {
				h.index > g ? (_ = h, h = null) : _ = h.sibling;
				var y = p(i, h, v.value, l);
				if (y === null) {
					h === null && (h = _);
					break;
				}
				e && h && y.alternate === null && t(i, h), o = a(y, o, g), d === null ? u = y : d.sibling = y, d = y, h = _;
			}
			if (v.done) return n(i, h), B && $i(i, g), u;
			if (h === null) {
				for (; !v.done; g++, v = c.next()) v = f(i, v.value, l), v !== null && (o = a(v, o, g), d === null ? u = v : d.sibling = v, d = v);
				return B && $i(i, g), u;
			}
			for (h = r(h); !v.done; g++, v = c.next()) v = m(h, i, g, v.value, l), v !== null && (e && (_ = v.alternate, _ !== null && h.delete(_.key === null ? g : _.key)), o = a(v, o, g), d === null ? u = v : d.sibling = v, d = v);
			return e && h.forEach(function(e) {
				return t(i, e);
			}), B && $i(i, g), u;
		}
		function _(e, r, a, c) {
			if (typeof a == "object" && a && a.type === A && a.key === null && a.props.ref === void 0 && (a = a.props.children), typeof a == "object" && a) {
				switch (a.$$typeof) {
					case k:
						a: {
							for (var l = a.key; r !== null;) {
								if (r.key === l) {
									if (l = a.type, l === A) {
										if (r.tag === 7) {
											n(e, r.sibling), c = i(r, a.props.children), co(c, a), c.return = e, e = c;
											break a;
										}
									} else if (r.elementType === l || typeof l == "object" && l && l.$$typeof === se && to(l) === r.type) {
										n(e, r.sibling), c = i(r, a.props), co(c, a), c.return = e, e = c;
										break a;
									}
									n(e, r);
									break;
								}
								t(e, r), r = r.sibling;
							}
							a.type === A ? (c = Ri(a.props.children, e.mode, c, a.key), co(c, a), c.return = e, e = c) : (c = Li(a.type, a.key, a.props, null, e.mode, c), co(c, a), c.return = e, e = c);
						}
						return o(e);
					case ee:
						a: {
							for (l = a.key; r !== null;) {
								if (r.key === l) {
									if (r.tag === 4 && r.stateNode.containerInfo === a.containerInfo && r.stateNode.implementation === a.implementation) {
										n(e, r.sibling), c = i(r, a.children || []), c.return = e, e = c;
										break a;
									}
									n(e, r);
									break;
								}
								t(e, r), r = r.sibling;
							}
							c = Vi(a, e.mode, c), c.return = e, e = c;
						}
						return o(e);
					case se: return a = to(a), _(e, r, a, c);
				}
				if (_e(a)) return h(e, r, a, c);
				if (me(a)) {
					if (l = me(a), typeof l != "function") throw Error(s(150));
					return a = l.call(a), g(e, r, a, c);
				}
				if (typeof a.then == "function") return _(e, r, so(a), c);
				if (a.$$typeof === M) return _(e, r, Ea(e, a), c);
				lo(e, a);
			}
			return typeof a == "string" && a !== "" || typeof a == "number" || typeof a == "bigint" ? (a = "" + a, r !== null && r.tag === 6 ? (n(e, r.sibling), c = i(r, a), c.return = e, e = c) : (n(e, r), c = zi(a, e.mode, c), c.return = e, e = c), o(e)) : n(e, r);
		}
		return function(e, t, n, r) {
			try {
				oo = 0;
				var i = _(e, t, n, r);
				return ao = null, i;
			} catch (t) {
				if (t === Ya || t === Za) throw t;
				var a = Ni(29, t, null, e.mode);
				return a.lanes = r, a.return = e, a;
			}
		};
	}
	var fo = uo(!0), po = uo(!1), mo = !1;
	function ho(e) {
		e.updateQueue = {
			baseState: e.memoizedState,
			firstBaseUpdate: null,
			lastBaseUpdate: null,
			shared: {
				pending: null,
				lanes: 0,
				hiddenCallbacks: null
			},
			callbacks: null
		};
	}
	function go(e, t) {
		e = e.updateQueue, t.updateQueue === e && (t.updateQueue = {
			baseState: e.baseState,
			firstBaseUpdate: e.firstBaseUpdate,
			lastBaseUpdate: e.lastBaseUpdate,
			shared: e.shared,
			callbacks: null
		});
	}
	function _o(e) {
		return {
			lane: e,
			tag: 0,
			payload: null,
			callback: null,
			next: null
		};
	}
	function vo(e, t, n) {
		var r = e.updateQueue;
		if (r === null) return null;
		if (r = r.shared, K & 2) {
			var i = r.pending;
			return i === null ? t.next = t : (t.next = i.next, i.next = t), r.pending = t, t = Ai(e), ki(e, null, n), t;
		}
		return Ei(e, r, t, n), Ai(e);
	}
	function yo(e, t, n) {
		if (t = t.updateQueue, t !== null && (t = t.shared, n & 4194048)) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, _t(e, n);
		}
	}
	function bo(e, t) {
		var n = e.updateQueue, r = e.alternate;
		if (r !== null && (r = r.updateQueue, n === r)) {
			var i = null, a = null;
			if (n = n.firstBaseUpdate, n !== null) {
				do {
					var o = {
						lane: n.lane,
						tag: n.tag,
						payload: n.payload,
						callback: null,
						next: null
					};
					a === null ? i = a = o : a = a.next = o, n = n.next;
				} while (n !== null);
				a === null ? i = a = t : a = a.next = t;
			} else i = a = t;
			n = {
				baseState: r.baseState,
				firstBaseUpdate: i,
				lastBaseUpdate: a,
				shared: r.shared,
				callbacks: r.callbacks
			}, e.updateQueue = n;
		} else e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
	}
	var xo = !1;
	function So() {
		if (xo) {
			var e = Ba;
			if (e !== null) throw e;
		}
	}
	function Co(e, t, n, r) {
		xo = !1;
		var i = e.updateQueue;
		mo = !1;
		var a = i.firstBaseUpdate, o = i.lastBaseUpdate, s = i.shared.pending;
		if (s !== null) {
			i.shared.pending = null;
			var c = s, l = c.next;
			c.next = null, o === null ? a = l : o.next = l, o = c;
			var u = e.alternate;
			u !== null && (u = u.updateQueue, s = u.lastBaseUpdate, s !== o && (s === null ? u.firstBaseUpdate = l : s.next = l, u.lastBaseUpdate = c));
		}
		if (a !== null) {
			var d = i.baseState;
			o = 0, u = l = c = null, s = a;
			do {
				var f = s.lane & -536870913, p = f !== s.lane;
				if (p ? (Y & f) === f : (r & f) === f) {
					f !== 0 && f === za && (xo = !0), u !== null && (u = u.next = {
						lane: 0,
						tag: s.tag,
						payload: s.payload,
						callback: null,
						next: null
					});
					a: {
						var m = e, h = s;
						f = t;
						var g = n;
						switch (h.tag) {
							case 1:
								if (m = h.payload, typeof m == "function") {
									d = m.call(g, d, f);
									break a;
								}
								d = m;
								break a;
							case 3: m.flags = m.flags & -65537 | 128;
							case 0:
								if (m = h.payload, f = typeof m == "function" ? m.call(g, d, f) : m, f == null) break a;
								d = D({}, d, f);
								break a;
							case 2: mo = !0;
						}
					}
					f = s.callback, f !== null && (e.flags |= 64, p && (e.flags |= 8192), p = i.callbacks, p === null ? i.callbacks = [f] : p.push(f));
				} else p = {
					lane: f,
					tag: s.tag,
					payload: s.payload,
					callback: s.callback,
					next: null
				}, u === null ? (l = u = p, c = d) : u = u.next = p, o |= f;
				if (s = s.next, s === null) {
					if (s = i.shared.pending, s === null) break;
					p = s, s = p.next, p.next = null, i.lastBaseUpdate = p, i.shared.pending = null;
				}
			} while (1);
			u === null && (c = d), i.baseState = c, i.firstBaseUpdate = l, i.lastBaseUpdate = u, a === null && (i.shared.lanes = 0), od |= o, e.lanes = o, e.memoizedState = d;
		}
	}
	function wo(e, t) {
		if (typeof e != "function") throw Error(s(191, e));
		e.call(t);
	}
	function To(e, t) {
		var n = e.callbacks;
		if (n !== null) for (e.callbacks = null, e = 0; e < n.length; e++) wo(n[e], t);
	}
	var Eo = xe(null), Do = xe(0);
	function Oo(e, t) {
		e = id, F(Do, e), F(Eo, t), id = e | t.baseLanes;
	}
	function ko() {
		F(Do, id), F(Eo, Eo.current);
	}
	function Ao() {
		id = Do.current, Se(Eo), Se(Do);
	}
	var jo = xe(null), Mo = null;
	function No(e) {
		var t = e.alternate;
		F(Ro, Ro.current & 1), F(jo, e), Mo === null && (t === null || Eo.current !== null || t.memoizedState !== null) && (Mo = e);
	}
	function Po(e) {
		F(Ro, Ro.current), F(jo, e), Mo === null && (Mo = e);
	}
	function Fo(e) {
		e.tag === 22 ? (F(Ro, Ro.current), F(jo, e), Mo === null && (Mo = e)) : Io();
	}
	function Io() {
		F(Ro, Ro.current), F(jo, jo.current);
	}
	function Lo(e) {
		Se(jo), Mo === e && (Mo = null), Se(Ro);
	}
	var Ro = xe(0);
	function zo(e, t) {
		F(jo, jo.current), F(Ro, t);
	}
	function Bo(e) {
		Se(Ro), Se(jo), Mo === e && (Mo = null);
	}
	function Vo(e) {
		for (var t = e; t !== null;) {
			if (t.tag === 13) {
				var n = t.memoizedState;
				if (n !== null && (n = n.dehydrated, n === null || om(n) || sm(n))) return t;
			} else if (t.tag === 19 && t.memoizedProps.revealOrder !== "independent") {
				if (t.flags & 128) return t;
			} else if (t.child !== null) {
				t.child.return = t, t = t.child;
				continue;
			}
			if (t === e) break;
			for (; t.sibling === null;) {
				if (t.return === null || t.return === e) return null;
				t = t.return;
			}
			t.sibling.return = t.return, t = t.sibling;
		}
		return null;
	}
	var Ho = 0, V = null, H = null, Uo = null, Wo = !1, Go = !1, Ko = !1, qo = 0, Jo = 0, Yo = null, Xo = 0;
	function Zo() {
		throw Error(s(321));
	}
	function Qo(e, t) {
		if (t === null) return !1;
		for (var n = 0; n < t.length && n < e.length; n++) if (!Hr(e[n], t[n])) return !1;
		return !0;
	}
	function $o(e, t, n, r, i, a) {
		return Ho = a, V = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, N.H = e === null || e.memoizedState === null ? gc : _c, Ko = !1, a = n(r, i), Ko = !1, Go && (a = ts(t, n, r, i)), es(e), a;
	}
	function es(e) {
		N.H = hc;
		var t = H !== null && H.next !== null;
		if (Ho = 0, Uo = H = V = null, Wo = !1, Jo = 0, Yo = null, t) throw Error(s(300));
		e === null || Pc || (e = e.dependencies, e !== null && Ca(e) && (Pc = !0));
	}
	function ts(e, t, n, r) {
		V = e;
		var i = 0;
		do {
			if (Go && (Yo = null), Jo = 0, Go = !1, 25 <= i) throw Error(s(301));
			if (i += 1, Uo = H = null, e.updateQueue != null) {
				var a = e.updateQueue;
				a.lastEffect = null, a.events = null, a.stores = null, a.memoCache != null && (a.memoCache.index = 0);
			}
			N.H = vc, a = t(n, r);
		} while (Go);
		return a;
	}
	function ns() {
		var e = N.H, t = e.useState()[0];
		return t = typeof t.then == "function" ? ls(t) : t, e = e.useState()[0], (H === null ? null : H.memoizedState) !== e && (V.flags |= 1024), t;
	}
	function rs() {
		var e = qo !== 0;
		return qo = 0, e;
	}
	function is(e, t, n) {
		t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~n;
	}
	function as(e) {
		if (Wo) {
			for (e = e.memoizedState; e !== null;) {
				var t = e.queue;
				t !== null && (t.pending = null), e = e.next;
			}
			Wo = !1;
		}
		Ho = 0, Uo = H = V = null, Go = !1, Jo = qo = 0, Yo = null;
	}
	function os() {
		var e = {
			memoizedState: null,
			baseState: null,
			baseQueue: null,
			queue: null,
			next: null
		};
		return Uo === null ? V.memoizedState = Uo = e : Uo = Uo.next = e, Uo;
	}
	function ss() {
		if (H === null) {
			var e = V.alternate;
			e = e === null ? null : e.memoizedState;
		} else e = H.next;
		var t = Uo === null ? V.memoizedState : Uo.next;
		if (t !== null) Uo = t, H = e;
		else {
			if (e === null) throw V.alternate === null ? Error(s(467)) : Error(s(310));
			H = e, e = {
				memoizedState: H.memoizedState,
				baseState: H.baseState,
				baseQueue: H.baseQueue,
				queue: H.queue,
				next: null
			}, Uo === null ? V.memoizedState = Uo = e : Uo = Uo.next = e;
		}
		return Uo;
	}
	function cs() {
		return {
			lastEffect: null,
			events: null,
			stores: null,
			memoCache: null
		};
	}
	function ls(e) {
		var t = Jo;
		return Jo += 1, Yo === null && (Yo = []), e = eo(Yo, e, t), t = V, (Uo === null ? t.memoizedState : Uo.next) === null && (t = t.alternate, N.H = t === null || t.memoizedState === null ? gc : _c), e;
	}
	function us(e) {
		if (typeof e == "object" && e) {
			if (typeof e.then == "function") return ls(e);
			if (e.$$typeof === fe) return;
			if (e.$$typeof === M) return Ta(e);
		}
		throw Error(s(438, String(e)));
	}
	function ds(e) {
		var t = null, n = V.updateQueue;
		if (n !== null && (t = n.memoCache), t == null) {
			var r = V.alternate;
			r !== null && (r = r.updateQueue, r !== null && (r = r.memoCache, r != null && (t = {
				data: r.data.map(function(e) {
					return e.slice();
				}),
				index: 0
			})));
		}
		if (t ?? (t = {
			data: [],
			index: 0
		}), n === null && (n = cs(), V.updateQueue = n), n.memoCache = t, n = t.data[t.index], n === void 0) for (n = t.data[t.index] = Array(e), r = 0; r < e; r++) n[r] = ue;
		return t.index++, n;
	}
	function fs(e, t) {
		return typeof t == "function" ? t(e) : t;
	}
	function ps(e) {
		return ms(ss(), H, e);
	}
	function ms(e, t, n) {
		var r = e.queue;
		if (r === null) throw Error(s(311));
		r.lastRenderedReducer = n;
		var i = e.baseQueue, a = r.pending;
		if (a !== null) {
			if (i !== null) {
				var o = i.next;
				i.next = a.next, a.next = o;
			}
			t.baseQueue = i = a, r.pending = null;
		}
		if (a = e.baseState, i === null) e.memoizedState = a;
		else {
			t = i.next;
			var c = o = null, l = null, u = t, d = !1;
			do {
				var f = u.lane & -536870913;
				if (f === u.lane ? (Ho & f) === f : (Y & f) === f) {
					var p = u.revertLane;
					if (p === 0) l !== null && (l = l.next = {
						lane: 0,
						revertLane: 0,
						gesture: null,
						action: u.action,
						hasEagerState: u.hasEagerState,
						eagerState: u.eagerState,
						next: null
					}), f === za && (d = !0);
					else if ((Ho & p) === p) {
						u = u.next, p === za && (d = !0);
						continue;
					} else f = {
						lane: 0,
						revertLane: u.revertLane,
						gesture: null,
						action: u.action,
						hasEagerState: u.hasEagerState,
						eagerState: u.eagerState,
						next: null
					}, l === null ? (c = l = f, o = a) : l = l.next = f, V.lanes |= p, od |= p;
					f = u.action, Ko && n(a, f), a = u.hasEagerState ? u.eagerState : n(a, f);
				} else p = {
					lane: f,
					revertLane: u.revertLane,
					gesture: u.gesture,
					action: u.action,
					hasEagerState: u.hasEagerState,
					eagerState: u.eagerState,
					next: null
				}, l === null ? (c = l = p, o = a) : l = l.next = p, V.lanes |= f, od |= f;
				u = u.next;
			} while (u !== null && u !== t);
			if (l === null ? o = a : l.next = c, !Hr(a, e.memoizedState) && (Pc = !0, d && (n = Ba, n !== null))) throw n;
			e.memoizedState = a, e.baseState = o, e.baseQueue = l, r.lastRenderedState = a;
		}
		return i === null && (r.lanes = 0), [e.memoizedState, r.dispatch];
	}
	function hs(e) {
		var t = ss(), n = t.queue;
		if (n === null) throw Error(s(311));
		n.lastRenderedReducer = e;
		var r = n.dispatch, i = n.pending, a = t.memoizedState;
		if (i !== null) {
			n.pending = null;
			var o = i = i.next;
			do
				a = e(a, o.action), o = o.next;
			while (o !== i);
			Hr(a, t.memoizedState) || (Pc = !0), t.memoizedState = a, t.baseQueue === null && (t.baseState = a), n.lastRenderedState = a;
		}
		return [a, r];
	}
	function gs(e, t, n) {
		var r = V, i = ss(), a = B;
		if (a) {
			if (n === void 0) throw Error(s(407));
			n = n();
		} else n = t();
		var o = !Hr((H || i).memoizedState, n);
		if (o && (i.memoizedState = n, Pc = !0), i = i.queue, Vs(ys.bind(null, r, i, e), [e]), e = i.getSnapshot !== t || o || Uo !== null && !!(Uo.memoizedState.tag & 1), Is(e ? 9 : 8, { destroy: void 0 }, vs.bind(null, r, i, n, t), null), e) {
			if (r.flags |= 2048, q === null) throw Error(s(349));
			a || Ho & 127 || _s(r, t, n);
		}
		return n;
	}
	function _s(e, t, n) {
		e.flags |= 16384, e = {
			getSnapshot: t,
			value: n
		}, t = V.updateQueue, t === null ? (t = cs(), V.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
	}
	function vs(e, t, n, r) {
		t.value = n, t.getSnapshot = r, bs(t) && xs(e);
	}
	function ys(e, t, n) {
		return n(function() {
			bs(t) && xs(e);
		});
	}
	function bs(e) {
		var t = e.getSnapshot;
		e = e.value;
		try {
			var n = t();
			return !Hr(e, n);
		} catch {
			return !0;
		}
	}
	function xs(e) {
		var t = Oi(e, 2);
		t !== null && Pd(t, e, 2);
	}
	function Ss(e) {
		var t = os();
		if (typeof e == "function") {
			var n = e;
			if (e = n(), Ko) {
				$e(!0);
				try {
					n();
				} finally {
					$e(!1);
				}
			}
		}
		return t.memoizedState = t.baseState = e, t.queue = {
			pending: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: fs,
			lastRenderedState: e
		}, t;
	}
	function Cs(e, t, n, r) {
		return e.baseState = n, ms(e, H, typeof r == "function" ? r : fs);
	}
	function ws(e, t, n, r, i) {
		if (fc(e)) throw Error(s(485));
		if (e = t.action, e !== null) {
			var a = {
				payload: i,
				action: e,
				next: null,
				isTransition: !0,
				status: "pending",
				value: null,
				reason: null,
				listeners: [],
				then: function(e) {
					a.listeners.push(e);
				}
			};
			N.T === null ? a.isTransition = !1 : n(!0), r(a), n = t.pending, n === null ? (a.next = t.pending = a, Ts(t, a)) : (a.next = n.next, t.pending = n.next = a);
		}
	}
	function Ts(e, t) {
		var n = t.action, r = t.payload, i = e.state;
		if (t.isTransition) {
			var a = N.T, o = {};
			o.types = a === null ? null : a.types, N.T = o;
			try {
				var s = n(i, r), c = N.S;
				c !== null && c(o, s), Es(e, t, s);
			} catch (n) {
				Os(e, t, n);
			} finally {
				a !== null && o.types !== null && (a.types = o.types), N.T = a;
			}
		} else try {
			a = n(i, r), Es(e, t, a);
		} catch (n) {
			Os(e, t, n);
		}
	}
	function Es(e, t, n) {
		typeof n == "object" && n && typeof n.then == "function" ? n.then(function(n) {
			Ds(e, t, n);
		}, function(n) {
			return Os(e, t, n);
		}) : Ds(e, t, n);
	}
	function Ds(e, t, n) {
		t.status = "fulfilled", t.value = n, ks(t), e.state = n, t = e.pending, t !== null && (n = t.next, n === t ? e.pending = null : (n = n.next, t.next = n, Ts(e, n)));
	}
	function Os(e, t, n) {
		var r = e.pending;
		if (e.pending = null, r !== null) {
			r = r.next;
			do
				t.status = "rejected", t.reason = n, ks(t), t = t.next;
			while (t !== r);
		}
		e.action = null;
	}
	function ks(e) {
		e = e.listeners;
		for (var t = 0; t < e.length; t++) (0, e[t])();
	}
	function As(e, t) {
		return t;
	}
	function js(e, t) {
		if (B) {
			var n = q.formState;
			if (n !== null) {
				a: {
					var r = V;
					if (B) {
						if (z) {
							b: {
								for (var i = z, a = oa; i.nodeType !== 8;) if (!a || (i = lm(i.nextSibling), i === null)) {
									i = null;
									break b;
								}
								a = i.data, i = a === "F!" || a === "F" ? i : null;
							}
							if (i) {
								z = lm(i.nextSibling), r = i.data === "F!";
								break a;
							}
						}
						ca(r);
					}
					r = !1;
				}
				r && (t = n[0]);
			}
		}
		return n = os(), n.memoizedState = n.baseState = t, r = {
			pending: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: As,
			lastRenderedState: t
		}, n.queue = r, n = lc.bind(null, V, r), r.dispatch = n, r = Ss(!1), a = dc.bind(null, V, !1, r.queue), r = os(), i = {
			state: t,
			dispatch: null,
			action: e,
			pending: null
		}, r.queue = i, n = ws.bind(null, V, i, a, n), i.dispatch = n, r.memoizedState = e, [
			t,
			n,
			!1
		];
	}
	function Ms(e) {
		return Ns(ss(), H, e);
	}
	function Ns(e, t, n) {
		if (t = ms(e, t, As)[0], e = ps(fs)[0], typeof t == "object" && t && typeof t.then == "function") try {
			var r = ls(t);
		} catch (e) {
			throw e === Ya ? Za : e;
		}
		else r = t;
		t = ss();
		var i = t.queue, a = i.dispatch;
		return n !== t.memoizedState && (V.flags |= 2048, Is(9, { destroy: void 0 }, Ps.bind(null, i, n), null)), [
			r,
			a,
			e
		];
	}
	function Ps(e, t) {
		e.action = t;
	}
	function Fs(e) {
		var t = ss(), n = H;
		if (n !== null) return Ns(t, n, e);
		ss(), t = t.memoizedState, n = ss();
		var r = n.queue.dispatch;
		return n.memoizedState = e, [
			t,
			r,
			!1
		];
	}
	function Is(e, t, n, r) {
		return e = {
			tag: e,
			create: n,
			deps: r,
			inst: t,
			next: null
		}, t = V.updateQueue, t === null && (t = cs(), V.updateQueue = t), n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e), e;
	}
	function Ls() {
		return ss().memoizedState;
	}
	function Rs(e, t, n, r) {
		var i = os();
		V.flags |= e, i.memoizedState = Is(1 | t, { destroy: void 0 }, n, r === void 0 ? null : r);
	}
	function zs(e, t, n, r) {
		var i = ss();
		r = r === void 0 ? null : r;
		var a = i.memoizedState.inst;
		H !== null && r !== null && Qo(r, H.memoizedState.deps) ? i.memoizedState = Is(t, a, n, r) : (V.flags |= e, i.memoizedState = Is(1 | t, a, n, r));
	}
	function Bs(e, t) {
		Rs(8390656, 8, e, t);
	}
	function Vs(e, t) {
		zs(2048, 8, e, t);
	}
	function Hs(e) {
		V.flags |= 4;
		var t = V.updateQueue;
		if (t === null) t = cs(), V.updateQueue = t, t.events = [e];
		else {
			var n = t.events;
			n === null ? t.events = [e] : n.push(e);
		}
	}
	function Us(e) {
		var t = ss().memoizedState;
		return Hs({
			ref: t,
			nextImpl: e
		}), function() {
			if (K & 2) throw Error(s(440));
			return t.impl.apply(void 0, arguments);
		};
	}
	function Ws(e, t) {
		return zs(4, 2, e, t);
	}
	function Gs(e, t) {
		return zs(4, 4, e, t);
	}
	function Ks(e, t) {
		if (typeof t == "function") {
			e = e();
			var n = t(e);
			return function() {
				typeof n == "function" ? n() : t(null);
			};
		}
		if (t != null) return e = e(), t.current = e, function() {
			t.current = null;
		};
	}
	function qs(e, t, n) {
		n = n == null ? null : n.concat([e]), zs(4, 4, Ks.bind(null, t, e), n);
	}
	function Js() {}
	function Ys(e, t) {
		var n = ss();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		return t !== null && Qo(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
	}
	function Xs(e, t) {
		var n = ss();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		if (t !== null && Qo(t, r[1])) return r[0];
		if (r = e(), Ko) {
			$e(!0);
			try {
				e();
			} finally {
				$e(!1);
			}
		}
		return n.memoizedState = [r, t], r;
	}
	function Zs(e, t, n) {
		return n === void 0 || Ho & 1073741824 && !(Y & 261930) ? e.memoizedState = t : (e.memoizedState = n, e = Md(), V.lanes |= e, od |= e, n);
	}
	function Qs(e, t, n, r) {
		return Hr(n, t) ? n : Eo.current === null ? !(Ho & 106) || Ho & 1073741824 && !(Y & 261930) ? (Pc = !0, e.memoizedState = n) : (e = Md(), V.lanes |= e, od |= e, t) : (e = Zs(e, n, r), Hr(e, t) || (Pc = !0), e);
	}
	function $s(e, t, n, r, i) {
		var a = P.p;
		P.p = a !== 0 && 8 > a ? a : 8;
		var o = N.T, s = {};
		s.types = o === null ? null : o.types, N.T = s, dc(e, !1, t, n);
		try {
			var c = i(), l = N.S;
			l !== null && l(s, c), typeof c == "object" && c && typeof c.then == "function" ? uc(e, t, Ua(c, r), jd(e)) : uc(e, t, r, jd(e));
		} catch (n) {
			uc(e, t, {
				then: function() {},
				status: "rejected",
				reason: n
			}, jd());
		} finally {
			P.p = a, o !== null && s.types !== null && (o.types = s.types), N.T = o;
		}
	}
	function ec() {}
	function tc(e, t, n, r) {
		if (e.tag !== 5) throw Error(s(476));
		var i = nc(e).queue;
		$s(e, i, t, ve, n === null ? ec : function() {
			return rc(e), n(r);
		});
	}
	function nc(e) {
		var t = e.memoizedState;
		if (t !== null) return t;
		t = {
			memoizedState: ve,
			baseState: ve,
			baseQueue: null,
			queue: {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: fs,
				lastRenderedState: ve
			},
			next: null
		};
		var n = {};
		return t.next = {
			memoizedState: n,
			baseState: n,
			baseQueue: null,
			queue: {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: fs,
				lastRenderedState: n
			},
			next: null
		}, e.memoizedState = t, e = e.alternate, e !== null && (e.memoizedState = t), t;
	}
	function rc(e) {
		var t = nc(e);
		t.next === null && (t = e.alternate.memoizedState), uc(e, t.next.queue, {}, jd());
	}
	function ic() {
		return Ta(sh);
	}
	function ac() {
		return ss().memoizedState;
	}
	function oc() {
		return ss().memoizedState;
	}
	function sc(e) {
		for (var t = e.return; t !== null;) {
			switch (t.tag) {
				case 24:
				case 3:
					var n = jd();
					e = _o(n);
					var r = vo(t, e, n);
					r !== null && (Pd(r, t, n), yo(r, t, n)), t = { cache: Ma() }, e.payload = t;
					return;
			}
			t = t.return;
		}
	}
	function cc(e, t, n) {
		var r = jd();
		n = {
			lane: r,
			revertLane: 0,
			gesture: null,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		}, fc(e) ? pc(t, n) : (n = Di(e, t, n, r), n !== null && (Pd(n, e, r), mc(n, t, r)));
	}
	function lc(e, t, n) {
		uc(e, t, n, jd());
	}
	function uc(e, t, n, r) {
		var i = {
			lane: r,
			revertLane: 0,
			gesture: null,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		};
		if (fc(e)) pc(t, i);
		else {
			var a = e.alternate;
			if (e.lanes === 0 && (a === null || a.lanes === 0) && (a = t.lastRenderedReducer, a !== null)) try {
				var o = t.lastRenderedState, s = a(o, n);
				if (i.hasEagerState = !0, i.eagerState = s, Hr(s, o)) return Ei(e, t, i, 0), q === null && Ti(), !1;
			} catch {}
			if (n = Di(e, t, i, r), n !== null) return Pd(n, e, r), mc(n, t, r), !0;
		}
		return !1;
	}
	function dc(e, t, n, r) {
		if (r = {
			lane: 2,
			revertLane: Pf(),
			gesture: null,
			action: r,
			hasEagerState: !1,
			eagerState: null,
			next: null
		}, fc(e)) {
			if (t) throw Error(s(479));
		} else t = Di(e, n, r, 2), t !== null && Pd(t, e, 2);
	}
	function fc(e) {
		var t = e.alternate;
		return e === V || t !== null && t === V;
	}
	function pc(e, t) {
		Go = Wo = !0;
		var n = e.pending;
		n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
	}
	function mc(e, t, n) {
		if (n & 4194048) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, _t(e, n);
		}
	}
	var hc = {
		readContext: Ta,
		use: us,
		useCallback: Zo,
		useContext: Zo,
		useEffect: Zo,
		useImperativeHandle: Zo,
		useLayoutEffect: Zo,
		useInsertionEffect: Zo,
		useMemo: Zo,
		useReducer: Zo,
		useRef: Zo,
		useState: Zo,
		useDebugValue: Zo,
		useDeferredValue: Zo,
		useTransition: Zo,
		useSyncExternalStore: Zo,
		useId: Zo,
		useHostTransitionStatus: Zo,
		useFormState: Zo,
		useActionState: Zo,
		useOptimistic: Zo,
		useMemoCache: Zo,
		useCacheRefresh: Zo,
		useEffectEvent: Zo
	}, gc = {
		readContext: Ta,
		use: us,
		useCallback: function(e, t) {
			return os().memoizedState = [e, t === void 0 ? null : t], e;
		},
		useContext: Ta,
		useEffect: Bs,
		useImperativeHandle: function(e, t, n) {
			n = n == null ? null : n.concat([e]), Rs(4194308, 4, Ks.bind(null, t, e), n);
		},
		useLayoutEffect: function(e, t) {
			return Rs(4194308, 4, e, t);
		},
		useInsertionEffect: function(e, t) {
			Rs(4, 2, e, t);
		},
		useMemo: function(e, t) {
			var n = os();
			t = t === void 0 ? null : t;
			var r = e();
			if (Ko) {
				$e(!0);
				try {
					e();
				} finally {
					$e(!1);
				}
			}
			return n.memoizedState = [r, t], r;
		},
		useReducer: function(e, t, n) {
			var r = os();
			if (n !== void 0) {
				var i = n(t);
				if (Ko) {
					$e(!0);
					try {
						n(t);
					} finally {
						$e(!1);
					}
				}
			} else i = t;
			return r.memoizedState = r.baseState = i, e = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: e,
				lastRenderedState: i
			}, r.queue = e, e = e.dispatch = cc.bind(null, V, e), [r.memoizedState, e];
		},
		useRef: function(e) {
			var t = os();
			return e = { current: e }, t.memoizedState = e;
		},
		useState: function(e) {
			e = Ss(e);
			var t = e.queue, n = lc.bind(null, V, t);
			return t.dispatch = n, [e.memoizedState, n];
		},
		useDebugValue: Js,
		useDeferredValue: function(e, t) {
			return Zs(os(), e, t);
		},
		useTransition: function() {
			var e = Ss(!1);
			return e = $s.bind(null, V, e.queue, !0, !1), os().memoizedState = e, [!1, e];
		},
		useSyncExternalStore: function(e, t, n) {
			var r = V, i = os();
			if (B) {
				if (n === void 0) throw Error(s(407));
				n = n();
			} else {
				if (n = t(), q === null) throw Error(s(349));
				Y & 127 || _s(r, t, n);
			}
			i.memoizedState = n;
			var a = {
				value: n,
				getSnapshot: t
			};
			return i.queue = a, Bs(ys.bind(null, r, a, e), [e]), r.flags |= 2048, Is(9, { destroy: void 0 }, vs.bind(null, r, a, n, t), null), n;
		},
		useId: function() {
			var e = os(), t = q.identifierPrefix;
			if (B) {
				var n = Qi, r = Zi;
				n = (r & ~(1 << 32 - et(r) - 1)).toString(32) + n, t = "_" + t + "R_" + n, n = qo++, 0 < n && (t += "H" + n.toString(32)), t += "_";
			} else n = Xo++, t = "_" + t + "r_" + n.toString(32) + "_";
			return e.memoizedState = t;
		},
		useHostTransitionStatus: ic,
		useFormState: js,
		useActionState: js,
		useOptimistic: function(e) {
			var t = os();
			t.memoizedState = t.baseState = e;
			var n = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: null,
				lastRenderedState: null
			};
			return t.queue = n, t = dc.bind(null, V, !0, n), n.dispatch = t, [e, t];
		},
		useMemoCache: ds,
		useCacheRefresh: function() {
			return os().memoizedState = sc.bind(null, V);
		},
		useEffectEvent: function(e) {
			var t = os(), n = { impl: e };
			return t.memoizedState = n, function() {
				if (K & 2) throw Error(s(440));
				return n.impl.apply(void 0, arguments);
			};
		}
	}, _c = {
		readContext: Ta,
		use: us,
		useCallback: Ys,
		useContext: Ta,
		useEffect: Vs,
		useImperativeHandle: qs,
		useInsertionEffect: Ws,
		useLayoutEffect: Gs,
		useMemo: Xs,
		useReducer: ps,
		useRef: Ls,
		useState: function() {
			return ps(fs);
		},
		useDebugValue: Js,
		useDeferredValue: function(e, t) {
			return Qs(ss(), H.memoizedState, e, t);
		},
		useTransition: function() {
			var e = ps(fs)[0], t = ss().memoizedState;
			return [typeof e == "boolean" ? e : ls(e), t];
		},
		useSyncExternalStore: gs,
		useId: ac,
		useHostTransitionStatus: ic,
		useFormState: Ms,
		useActionState: Ms,
		useOptimistic: function(e, t) {
			return Cs(ss(), H, e, t);
		},
		useMemoCache: ds,
		useCacheRefresh: oc,
		useEffectEvent: Us
	}, vc = {
		readContext: Ta,
		use: us,
		useCallback: Ys,
		useContext: Ta,
		useEffect: Vs,
		useImperativeHandle: qs,
		useInsertionEffect: Ws,
		useLayoutEffect: Gs,
		useMemo: Xs,
		useReducer: hs,
		useRef: Ls,
		useState: function() {
			return hs(fs);
		},
		useDebugValue: Js,
		useDeferredValue: function(e, t) {
			var n = ss();
			return H === null ? Zs(n, e, t) : Qs(n, H.memoizedState, e, t);
		},
		useTransition: function() {
			var e = hs(fs)[0], t = ss().memoizedState;
			return [typeof e == "boolean" ? e : ls(e), t];
		},
		useSyncExternalStore: gs,
		useId: ac,
		useHostTransitionStatus: ic,
		useFormState: Fs,
		useActionState: Fs,
		useOptimistic: function(e, t) {
			var n = ss();
			return H === null ? (n.baseState = e, [e, n.queue.dispatch]) : Cs(n, H, e, t);
		},
		useMemoCache: ds,
		useCacheRefresh: oc,
		useEffectEvent: Us
	};
	function yc(e, t, n, r) {
		t = e.memoizedState, n = n(r, t), n = n == null ? t : D({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
	}
	var bc = {
		enqueueSetState: function(e, t, n) {
			e = e._reactInternals;
			var r = jd(), i = _o(r);
			i.payload = t, n != null && (i.callback = n), t = vo(e, i, r), t !== null && (Pd(t, e, r), yo(t, e, r));
		},
		enqueueReplaceState: function(e, t, n) {
			e = e._reactInternals;
			var r = jd(), i = _o(r);
			i.tag = 1, i.payload = t, n != null && (i.callback = n), t = vo(e, i, r), t !== null && (Pd(t, e, r), yo(t, e, r));
		},
		enqueueForceUpdate: function(e, t) {
			e = e._reactInternals;
			var n = jd(), r = _o(n);
			r.tag = 2, t != null && (r.callback = t), t = vo(e, r, n), t !== null && (Pd(t, e, n), yo(t, e, n));
		}
	};
	function xc(e, t, n, r, i, a, o) {
		return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, a, o) : t.prototype && t.prototype.isPureReactComponent ? !Ur(n, r) || !Ur(i, a) : !0;
	}
	function Sc(e, t, n, r) {
		e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && bc.enqueueReplaceState(t, t.state, null);
	}
	function Cc(e, t) {
		var n = t;
		if ("ref" in t) for (var r in n = {}, t) r !== "ref" && (n[r] = t[r]);
		if (e = e.defaultProps) for (var i in n === t && (n = D({}, n)), e) n[i] === void 0 && (n[i] = e[i]);
		return n;
	}
	function wc(e) {
		xi(e);
	}
	function Tc(e) {
		console.error(e);
	}
	function Ec(e) {
		xi(e);
	}
	function Dc(e, t) {
		try {
			var n = e.onUncaughtError;
			n(t.value, { componentStack: t.stack });
		} catch (e) {
			setTimeout(function() {
				throw e;
			});
		}
	}
	function Oc(e, t, n) {
		try {
			var r = e.onCaughtError;
			r(n.value, {
				componentStack: n.stack,
				errorBoundary: t.tag === 1 ? t.stateNode : null
			});
		} catch (e) {
			setTimeout(function() {
				throw e;
			});
		}
	}
	function kc(e, t, n) {
		return n = _o(n), n.tag = 3, n.payload = { element: null }, n.callback = function() {
			Dc(e, t);
		}, n;
	}
	function Ac(e) {
		return e = _o(e), e.tag = 3, e;
	}
	function jc(e, t, n, r) {
		var i = n.type.getDerivedStateFromError;
		if (typeof i == "function") {
			var a = r.value;
			e.payload = function() {
				return i(a);
			}, e.callback = function() {
				Oc(t, n, r);
			};
		}
		var o = n.stateNode;
		o !== null && typeof o.componentDidCatch == "function" && (e.callback = function() {
			Oc(t, n, r), typeof i != "function" && (vd === null ? vd = /* @__PURE__ */ new Set([this]) : vd.add(this));
			var e = r.stack;
			this.componentDidCatch(r.value, { componentStack: e === null ? "" : e });
		});
	}
	function Mc(e, t, n, r, i) {
		if (n.flags |= 32768, typeof r == "object" && r && typeof r.then == "function") {
			if (t = n.alternate, t !== null && Sa(t, n, i, !0), n = jo.current, n !== null) {
				switch (n.tag) {
					case 31:
					case 13:
					case 19: return Mo === null ? Kd() : n.alternate === null && ad === 0 && (ad = 3), n.flags &= -257, n.flags |= 65536, n.lanes = i, r === Qa ? n.flags |= 16384 : (t = n.updateQueue, t === null ? n.updateQueue = /* @__PURE__ */ new Set([r]) : t.add(r), mf(e, r, i)), !1;
					case 22: return n.flags |= 65536, r === Qa ? n.flags |= 16384 : (t = n.updateQueue, t === null ? (t = {
						transitions: null,
						markerInstances: null,
						retryQueue: /* @__PURE__ */ new Set([r])
					}, n.updateQueue = t) : (n = t.retryQueue, n === null ? t.retryQueue = /* @__PURE__ */ new Set([r]) : n.add(r)), mf(e, r, i)), !1;
				}
				throw Error(s(435, n.tag));
			}
			return mf(e, r, i), Kd(), !1;
		}
		if (B) return t = jo.current, t === null ? (r !== sa && (t = Error(s(423), { cause: r }), ma(Ui(t, n))), e = e.current.alternate, e.flags |= 65536, i &= -i, e.lanes |= i, r = Ui(r, n), i = kc(e.stateNode, r, i), bo(e, i), ad !== 4 && (ad = 2)) : (!(t.flags & 65536) && (t.flags |= 256), t.flags |= 65536, t.lanes = i, r !== sa && (e = Error(s(422), { cause: r }), ma(Ui(e, n)))), !1;
		var a = Error(s(520), { cause: r });
		if (a = Ui(a, n), dd === null ? dd = [a] : dd.push(a), ad !== 4 && (ad = 2), t === null) return !0;
		r = Ui(r, n), n = t;
		do {
			switch (n.tag) {
				case 3: return n.flags |= 65536, e = i & -i, n.lanes |= e, e = kc(n.stateNode, r, e), bo(n, e), !1;
				case 1:
					if (t = n.type, a = n.stateNode, !(n.flags & 128) && (typeof t.getDerivedStateFromError == "function" || a !== null && typeof a.componentDidCatch == "function" && (vd === null || !vd.has(a)))) return n.flags |= 65536, i &= -i, n.lanes |= i, i = Ac(i), jc(i, e, n, r), bo(n, i), !1;
					break;
				case 22: if (n.memoizedState !== null) return n.flags |= 65536, !1;
			}
			n = n.return;
		} while (n !== null);
		return !1;
	}
	var Nc = Error(s(461)), Pc = !1;
	function Fc(e, t, n, r) {
		t.child = e === null ? po(t, null, n, r) : fo(t, e.child, n, r);
	}
	function Ic(e, t, n, r, i) {
		n = n.render;
		var a = t.ref;
		if ("ref" in r) {
			var o = {};
			for (var s in r) s !== "ref" && (o[s] = r[s]);
		} else o = r;
		return wa(t), r = $o(e, t, n, o, a, i), s = rs(), e !== null && !Pc ? (is(e, t, i), ul(e, t, i)) : (B && s && ta(t), t.flags |= 1, Fc(e, t, r, i), t.child);
	}
	function Lc(e, t, n, r, i) {
		if (e === null) {
			var a = n.type;
			return typeof a == "function" && !Pi(a) && a.defaultProps === void 0 && n.compare === null ? (t.tag = 15, t.type = a, Rc(e, t, a, r, i)) : (e = Li(n.type, null, r, t, t.mode, i), e.ref = t.ref, e.return = t, t.child = e);
		}
		if (a = e.child, !dl(e, i)) {
			var o = a.memoizedProps;
			if (n = n.compare, n = n === null ? Ur : n, n(o, r) && e.ref === t.ref) return ul(e, t, i);
		}
		return t.flags |= 1, e = Fi(a, r), e.ref = t.ref, e.return = t, t.child = e;
	}
	function Rc(e, t, n, r, i) {
		if (e !== null) {
			var a = e.memoizedProps;
			if (Ur(a, r) && e.ref === t.ref) {
				if (Pc = !1, t.pendingProps = r = a, dl(e, i)) e.flags & 131072 && (Pc = !0);
				else return t.lanes = e.lanes, ul(e, t, i);
			}
		}
		return Kc(e, t, n, r, i);
	}
	function zc(e, t, n, r) {
		var i = r.children, a = e === null ? null : e.memoizedState;
		if (e === null && t.stateNode === null && (t.stateNode = {
			_visibility: 1,
			_pendingMarkers: null,
			_retryCache: null,
			_transitions: null
		}), r.mode === "hidden") {
			if (t.flags & 128) {
				if (a = a === null ? n : a.baseLanes | n, e !== null) {
					for (r = t.child = e.child, i = 0; r !== null;) i = i | r.lanes | r.childLanes, r = r.sibling;
					r = i & ~a;
				} else r = 0, t.child = null;
				return Vc(e, t, a, n, r);
			}
			if (n & 536870912) t.memoizedState = {
				baseLanes: 0,
				cachePool: null
			}, e !== null && qa(t, a === null ? null : a.cachePool), a === null ? ko() : Oo(t, a), Fo(t);
			else return r = t.lanes = 536870912, Vc(e, t, a === null ? n : a.baseLanes | n, n, r);
		} else a === null ? (e !== null && qa(t, null), ko(), Io()) : (qa(t, a.cachePool), Oo(t, a), Io(), t.memoizedState = null);
		return Fc(e, t, i, n), t.child;
	}
	function Bc(e, t) {
		return e !== null && e.tag === 22 || t.stateNode !== null || (t.stateNode = {
			_visibility: 1,
			_pendingMarkers: null,
			_retryCache: null,
			_transitions: null
		}), t.sibling;
	}
	function Vc(e, t, n, r, i) {
		var a = Ka();
		return a = a === null ? null : {
			parent: ja._currentValue,
			pool: a
		}, t.memoizedState = {
			baseLanes: n,
			cachePool: a
		}, e !== null && qa(t, null), ko(), Fo(t), e !== null && Sa(e, t, r, !0), t.childLanes = i, null;
	}
	function Hc(e, t) {
		return t = tl({
			mode: t.mode,
			children: t.children
		}, e.mode), t.ref = e.ref, e.child = t, t.return = e, t;
	}
	function Uc(e, t, n) {
		return fo(t, e.child, null, n), e = Hc(t, t.pendingProps), e.flags |= 2, Lo(t), t.memoizedState = null, e;
	}
	function Wc(e, t, n) {
		var r = t.pendingProps, i = !!(t.flags & 128);
		if (t.flags &= -129, e === null) {
			if (B) {
				if (r.mode === "hidden") return e = Hc(t, r), t.lanes = 536870912, e.memoizedState = {
					baseLanes: 0,
					cachePool: null
				}, Bc(null, e);
				if (Po(t), (e = z) ? (e = am(e, oa), e = e !== null && e.data === "&" ? e : null, e !== null && (t.memoizedState = {
					dehydrated: e,
					treeContext: Xi === null ? null : {
						id: Zi,
						overflow: Qi
					},
					retryLane: 536870912,
					hydrationErrors: null
				}, n = Bi(e), n.return = t, t.child = n, ia = t, z = null)) : e = null, e === null) throw ca(t);
				return t.lanes = 536870912, null;
			}
			return Hc(t, r);
		}
		var a = e.memoizedState;
		if (a !== null) {
			var o = a.dehydrated;
			if (Po(t), i) {
				if (t.flags & 256) t.flags &= -257, t = Uc(e, t, n);
				else if (t.memoizedState !== null) t.child = e.child, t.flags |= 128, t = null;
				else throw Error(s(558));
			} else if (Pc || Sa(e, t, n, !1), i = (n & e.childLanes) !== 0, Pc || i) {
				if (Eo.current === null) {
					if (r = q, r !== null && (o = vt(r, n), o !== 0 && o !== a.retryLane)) throw a.retryLane = o, Oi(e, o), Pd(r, e, o), Nc;
					Kd();
				}
				t = Uc(e, t, n);
			} else e = a.treeContext, z = lm(o.nextSibling), ia = t, B = !0, aa = null, oa = !1, e !== null && ra(t, e), t = Hc(t, r), t.flags |= 134221824;
			return t;
		}
		return e = Fi(e.child, {
			mode: r.mode,
			children: r.children
		}), e.ref = t.ref, t.child = e, e.return = t, e;
	}
	function Gc(e, t) {
		var n = t.ref;
		if (n === null) e !== null && e.ref !== null && (t.flags |= 4194816);
		else {
			if (typeof n != "function" && typeof n != "object") throw Error(s(284));
			(e === null || e.ref !== n) && (t.flags |= 4194816);
		}
	}
	function Kc(e, t, n, r, i) {
		return wa(t), n = $o(e, t, n, r, void 0, i), r = rs(), e !== null && !Pc ? (is(e, t, i), ul(e, t, i)) : (B && r && ta(t), t.flags |= 1, Fc(e, t, n, i), t.child);
	}
	function qc(e, t, n, r, i, a) {
		return wa(t), t.updateQueue = null, n = ts(t, r, n, i), es(e), r = rs(), e !== null && !Pc ? (is(e, t, a), ul(e, t, a)) : (B && r && ta(t), t.flags |= 1, Fc(e, t, n, a), t.child);
	}
	function Jc(e, t, n, r, i) {
		if (wa(t), t.stateNode === null) {
			var a = ji, o = n.contextType;
			typeof o == "object" && o && (a = Ta(o)), a = new n(r, a), t.memoizedState = a.state !== null && a.state !== void 0 ? a.state : null, a.updater = bc, t.stateNode = a, a._reactInternals = t, a = t.stateNode, a.props = r, a.state = t.memoizedState, a.refs = {}, ho(t), o = n.contextType, a.context = typeof o == "object" && o ? Ta(o) : ji, a.state = t.memoizedState, o = n.getDerivedStateFromProps, typeof o == "function" && (yc(t, n, o, r), a.state = t.memoizedState), typeof n.getDerivedStateFromProps == "function" || typeof a.getSnapshotBeforeUpdate == "function" || typeof a.UNSAFE_componentWillMount != "function" && typeof a.componentWillMount != "function" || (o = a.state, typeof a.componentWillMount == "function" && a.componentWillMount(), typeof a.UNSAFE_componentWillMount == "function" && a.UNSAFE_componentWillMount(), o !== a.state && bc.enqueueReplaceState(a, a.state, null), Co(t, r, a, i), So(), a.state = t.memoizedState), typeof a.componentDidMount == "function" && (t.flags |= 4194308), r = !0;
		} else if (e === null) {
			a = t.stateNode;
			var s = t.memoizedProps, c = Cc(n, s);
			a.props = c;
			var l = a.context, u = n.contextType;
			o = ji, typeof u == "object" && u && (o = Ta(u));
			var d = n.getDerivedStateFromProps;
			u = typeof d == "function" || typeof a.getSnapshotBeforeUpdate == "function", s = t.pendingProps !== s, u || typeof a.UNSAFE_componentWillReceiveProps != "function" && typeof a.componentWillReceiveProps != "function" || (s || l !== o) && Sc(t, a, r, o), mo = !1;
			var f = t.memoizedState;
			a.state = f, Co(t, r, a, i), So(), l = t.memoizedState, s || f !== l || mo ? (typeof d == "function" && (yc(t, n, d, r), l = t.memoizedState), (c = mo || xc(t, n, c, r, f, l, o)) ? (u || typeof a.UNSAFE_componentWillMount != "function" && typeof a.componentWillMount != "function" || (typeof a.componentWillMount == "function" && a.componentWillMount(), typeof a.UNSAFE_componentWillMount == "function" && a.UNSAFE_componentWillMount()), typeof a.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof a.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = l), a.props = r, a.state = l, a.context = o, r = c) : (typeof a.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
		} else {
			a = t.stateNode, go(e, t), o = t.memoizedProps, u = Cc(n, o), a.props = u, d = t.pendingProps, f = a.context, l = n.contextType, c = ji, typeof l == "object" && l && (c = Ta(l)), s = n.getDerivedStateFromProps, (l = typeof s == "function" || typeof a.getSnapshotBeforeUpdate == "function") || typeof a.UNSAFE_componentWillReceiveProps != "function" && typeof a.componentWillReceiveProps != "function" || (o !== d || f !== c) && Sc(t, a, r, c), mo = !1, f = t.memoizedState, a.state = f, Co(t, r, a, i), So();
			var p = t.memoizedState;
			o !== d || f !== p || mo || e !== null && e.dependencies !== null && Ca(e.dependencies) ? (typeof s == "function" && (yc(t, n, s, r), p = t.memoizedState), (u = mo || xc(t, n, u, r, f, p, c) || e !== null && e.dependencies !== null && Ca(e.dependencies)) ? (l || typeof a.UNSAFE_componentWillUpdate != "function" && typeof a.componentWillUpdate != "function" || (typeof a.componentWillUpdate == "function" && a.componentWillUpdate(r, p, c), typeof a.UNSAFE_componentWillUpdate == "function" && a.UNSAFE_componentWillUpdate(r, p, c)), typeof a.componentDidUpdate == "function" && (t.flags |= 4), typeof a.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof a.componentDidUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof a.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = p), a.props = r, a.state = p, a.context = c, r = u) : (typeof a.componentDidUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof a.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), r = !1);
		}
		return a = r, Gc(e, t), r = !!(t.flags & 128), a || r ? (a = t.stateNode, n = r && typeof n.getDerivedStateFromError != "function" ? null : a.render(), t.flags |= 1, e !== null && r ? (t.child = fo(t, e.child, null, i), t.child = fo(t, null, n, i)) : Fc(e, t, n, i), t.memoizedState = a.state, e = t.child) : e = ul(e, t, i), e;
	}
	function Yc(e, t, n, r) {
		return fa(), t.flags |= 256, Fc(e, t, n, r), t.child;
	}
	var Xc = {
		dehydrated: null,
		treeContext: null,
		retryLane: 0,
		hydrationErrors: null
	};
	function Zc(e) {
		return {
			baseLanes: e,
			cachePool: Ja()
		};
	}
	function Qc(e, t, n) {
		return e = e === null ? 0 : e.childLanes & ~n, t && (e |= ld), e;
	}
	function $c(e, t, n) {
		var r = t.pendingProps, i = !1, a = !!(t.flags & 128), o;
		if ((o = a) || (o = e !== null && e.memoizedState === null ? !1 : !!(Ro.current & 2)), o && (i = !0, t.flags &= -129), o = !!(t.flags & 32), t.flags &= -33, e === null) {
			if (B) {
				if (i ? No(t) : Io(), (e = z) ? (e = am(e, oa), e = e !== null && e.data !== "&" ? e : null, e !== null && (t.memoizedState = {
					dehydrated: e,
					treeContext: Xi === null ? null : {
						id: Zi,
						overflow: Qi
					},
					retryLane: 536870912,
					hydrationErrors: null
				}, n = Bi(e), n.return = t, t.child = n, ia = t, z = null)) : e = null, e === null) throw ca(t);
				return t.lanes = sm(e) ? 32 : 536870912, null;
			}
			return a = r.children, r = r.fallback, i ? (Io(), i = t.mode, a = tl({
				mode: "hidden",
				children: a
			}, i), r = Ri(r, i, n, null), a.return = t, r.return = t, a.sibling = r, t.child = a, r = t.child, r.memoizedState = Zc(n), r.childLanes = Qc(e, o, n), t.memoizedState = Xc, Bc(null, r)) : (No(t), el(t, a));
		}
		var s = e.memoizedState;
		if (s !== null) {
			var c = s.dehydrated;
			if (c !== null) return rl(e, t, a, o, r, c, s, n);
		}
		return i ? (Io(), i = r.fallback, a = t.mode, s = e.child, c = s.sibling, r = Fi(s, {
			mode: "hidden",
			children: r.children
		}), r.subtreeFlags = s.subtreeFlags & 1206910976, c === null ? (i = Ri(i, a, n, null), i.flags |= 2) : i = Fi(c, i), i.return = t, r.return = t, r.sibling = i, t.child = r, Bc(null, r), r = t.child, i = e.child.memoizedState, i === null ? i = Zc(n) : (a = i.cachePool, a === null ? a = Ja() : (s = ja._currentValue, a = a.parent === s ? a : {
			parent: s,
			pool: s
		}), i = {
			baseLanes: i.baseLanes | n,
			cachePool: a
		}), r.memoizedState = i, r.childLanes = Qc(e, o, n), t.memoizedState = Xc, Bc(e.child, r)) : (No(t), n = e.child, e = n.sibling, n = Fi(n, {
			mode: "visible",
			children: r.children
		}), n.return = t, n.sibling = null, e !== null && (o = t.deletions, o === null ? (t.deletions = [e], t.flags |= 16) : o.push(e)), t.child = n, t.memoizedState = null, n);
	}
	function el(e, t) {
		return t = tl({
			mode: "visible",
			children: t
		}, e.mode), t.return = e, e.child = t;
	}
	function tl(e, t) {
		return e = Ni(22, e, null, t), e.lanes = 0, e;
	}
	function nl(e, t, n) {
		return fo(t, e.child, null, n), e = el(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
	}
	function rl(e, t, n, r, i, a, o, c) {
		if (n) return t.flags & 256 ? (No(t), t.flags &= -257, nl(e, t, c)) : t.memoizedState === null ? (Io(), a = i.fallback, o = t.mode, i = tl({
			mode: "visible",
			children: i.children
		}, o), a = Ri(a, o, c, null), a.flags |= 2, i.return = t, a.return = t, i.sibling = a, t.child = i, fo(t, e.child, null, c), i = t.child, i.memoizedState = Zc(c), i.childLanes = Qc(e, r, c), t.memoizedState = Xc, Bc(null, i)) : (Io(), t.child = e.child, t.flags |= 128, null);
		if (No(t), sm(a)) {
			if (r = a.nextSibling && a.nextSibling.dataset, r) var l = r.dgst;
			return r = l, r !== "" && (i = Error(s(419)), i.stack = "", i.digest = r, ma({
				value: i,
				source: null,
				stack: null
			})), nl(e, t, c);
		}
		if (Pc || Sa(e, t, c, !1), r = (c & e.childLanes) !== 0, Pc || r) {
			if (Eo.current !== null) return nl(e, t, c);
			if (r = q, r !== null && (i = vt(r, c), i !== 0 && i !== o.retryLane)) throw o.retryLane = i, Oi(e, i), Pd(r, e, i), Nc;
			return om(a) || Kd(), nl(e, t, c);
		}
		return om(a) ? (t.flags |= 192, t.child = e.child, null) : (e = o.treeContext, z = lm(a.nextSibling), ia = t, B = !0, aa = null, oa = !1, e !== null && ra(t, e), t = el(t, i.children), t.flags |= 134221824, t);
	}
	function il(e, t, n) {
		e.lanes |= t;
		var r = e.alternate;
		r !== null && (r.lanes |= t), ba(e.return, t, n);
	}
	function al(e) {
		for (var t = null; e !== null;) {
			var n = e.alternate;
			n !== null && Vo(n) === null && (t = e), e = e.sibling;
		}
		return t;
	}
	function ol(e, t, n, r, i, a) {
		var o = e.memoizedState;
		o === null ? e.memoizedState = {
			isBackwards: t,
			rendering: null,
			renderingStartTime: 0,
			last: r,
			tail: n,
			tailMode: i,
			treeForkCount: a
		} : (o.isBackwards = t, o.rendering = null, o.renderingStartTime = 0, o.last = r, o.tail = n, o.tailMode = i, o.treeForkCount = a);
	}
	function sl(e) {
		var t = e.child;
		for (e.child = null; t !== null;) {
			var n = t.sibling;
			t.sibling = e.child, e.child = t, t = n;
		}
	}
	function cl(e, t, n) {
		var r = t.pendingProps, i = r.revealOrder, a = r.tail;
		r = r.children;
		var o = Ro.current;
		if (t.flags & 128) return zo(t, o), null;
		var s = !!(o & 2);
		if (s ? (o = o & 1 | 2, t.flags |= 128) : o &= 1, zo(t, o), i === "backwards" && e !== null ? (sl(e), Fc(e, t, r, n), sl(e)) : Fc(e, t, r, n), r = B ? qi : 0, !s && e !== null && e.flags & 128) a: for (e = t.child; e !== null;) {
			if (e.tag === 13) e.memoizedState !== null && il(e, n, t);
			else if (e.tag === 19) il(e, n, t);
			else if (e.child !== null) {
				e.child.return = e, e = e.child;
				continue;
			}
			if (e === t) break a;
			for (; e.sibling === null;) {
				if (e.return === null || e.return === t) break a;
				e = e.return;
			}
			e.sibling.return = e.return, e = e.sibling;
		}
		switch (i) {
			case "backwards":
				n = al(t.child), n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null, sl(t)), ol(t, !0, i, null, a, r);
				break;
			case "unstable_legacy-backwards":
				for (n = null, i = t.child, t.child = null; i !== null;) {
					if (e = i.alternate, e !== null && Vo(e) === null) {
						t.child = i;
						break;
					}
					e = i.sibling, i.sibling = n, n = i, i = e;
				}
				ol(t, !0, n, null, a, r);
				break;
			case "together":
				ol(t, !1, null, null, void 0, r);
				break;
			case "independent":
				t.memoizedState = null;
				break;
			default: n = al(t.child), n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null), ol(t, !1, i, n, a, r);
		}
		return t.child;
	}
	function ll(e, t, n) {
		var r = t.pendingProps;
		return va(t, t.type, r.value), Fc(e, t, r.children, n), t.child;
	}
	function ul(e, t, n) {
		if (e !== null && (t.dependencies = e.dependencies), od |= t.lanes, (n & t.childLanes) === 0) {
			if (e !== null) {
				if (Sa(e, t, n, !1), (n & t.childLanes) === 0) return null;
			} else return null;
		}
		if (e !== null && t.child !== e.child) throw Error(s(153));
		if (t.child !== null) {
			for (e = t.child, n = Fi(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null;) e = e.sibling, n = n.sibling = Fi(e, e.pendingProps), n.return = t;
			n.sibling = null;
		}
		return t.child;
	}
	function dl(e, t) {
		return (e.lanes & t) !== 0 || (e = e.dependencies, !!(e !== null && Ca(e)));
	}
	function fl(e, t, n) {
		switch (t.tag) {
			case 3:
				De(t, t.stateNode.containerInfo), va(t, ja, e.memoizedState.cache), fa();
				break;
			case 27:
			case 5:
				ke(t);
				break;
			case 4:
				De(t, t.stateNode.containerInfo);
				break;
			case 10:
				va(t, t.type, t.memoizedProps.value);
				break;
			case 31:
				if (t.memoizedState !== null) return t.flags |= 128, Po(t), null;
				break;
			case 13:
				var r = t.memoizedState;
				if (r !== null) {
					if (r.dehydrated !== null) return No(t), t.flags |= 128, null;
					r = Sa(e, t, n, !1);
					var i = t.child.childLanes;
					return r || (n & i) !== 0 ? $c(e, t, n) : (No(t), e = ul(e, t, n), e === null ? null : e.sibling);
				}
				No(t);
				break;
			case 19:
				if (t.flags & 128) return cl(e, t, n);
				if (i = !!(e.flags & 128), r = (n & t.childLanes) !== 0, r || (Sa(e, t, n, !1), r = (n & t.childLanes) !== 0), i) {
					if (r) return cl(e, t, n);
					t.flags |= 128;
				}
				if (i = t.memoizedState, i !== null && (i.rendering = null, i.tail = null, i.lastEffect = null), zo(t, Ro.current), r) break;
				return null;
			case 22: return t.lanes = 0, zc(e, t, n, t.pendingProps);
			case 24: va(t, ja, e.memoizedState.cache);
		}
		return ul(e, t, n);
	}
	function pl(e, t, n) {
		if (e !== null) {
			if (e.memoizedProps !== t.pendingProps) Pc = !0;
			else {
				if (!dl(e, n) && !(t.flags & 128)) return Pc = !1, fl(e, t, n);
				Pc = !!(e.flags & 131072);
			}
		} else Pc = !1, B && t.flags & 1048576 && ea(t, qi, t.index);
		switch (t.lanes = 0, t.tag) {
			case 16:
				a: {
					var r = t.pendingProps;
					if (e = to(t.elementType), t.type = e, typeof e == "function") Pi(e) ? (r = Cc(e, r), t.tag = 1, t = Jc(null, t, e, r, n)) : (t.tag = 0, t = Kc(null, t, e, r, n));
					else {
						if (e != null) {
							var i = e.$$typeof;
							if (i === re) {
								t.tag = 11, t = Ic(null, t, e, r, n);
								break a;
							}
							if (i === oe) {
								t.tag = 14, t = Lc(null, t, e, r, n);
								break a;
							}
							if (i === M) {
								t.tag = 10, t.type = e, t = ll(null, t, n);
								break a;
							}
						}
						throw t = ge(e) || e, Error(s(306, t, ""));
					}
				}
				return t;
			case 0: return Kc(e, t, t.type, t.pendingProps, n);
			case 1: return r = t.type, i = Cc(r, t.pendingProps), Jc(e, t, r, i, n);
			case 3:
				a: {
					if (De(t, t.stateNode.containerInfo), e === null) throw Error(s(387));
					r = t.pendingProps;
					var a = t.memoizedState;
					i = a.element, go(e, t), Co(t, r, null, n);
					var o = t.memoizedState;
					if (r = o.cache, va(t, ja, r), r !== a.cache && xa(t, [ja], n, !0), So(), r = o.element, a.isDehydrated) {
						if (a = {
							element: r,
							isDehydrated: !1,
							cache: o.cache
						}, t.updateQueue.baseState = a, t.memoizedState = a, t.flags & 256) {
							t = Yc(e, t, r, n);
							break a;
						}
						if (r !== i) {
							i = Ui(Error(s(424)), t), ma(i), t = Yc(e, t, r, n);
							break a;
						}
						switch (e = t.stateNode.containerInfo, e.nodeType) {
							case 9:
								e = e.body;
								break;
							default: e = e.nodeName === "HTML" ? e.ownerDocument.body : e;
						}
						for (z = lm(e.firstChild), ia = t, B = !0, aa = null, oa = !0, n = po(t, null, r, n), t.child = n; n;) n.flags = n.flags & -3 | 134221824, n = n.sibling;
					} else {
						if (fa(), r === i) {
							t = ul(e, t, n);
							break a;
						}
						Fc(e, t, r, n);
					}
					t = t.child;
				}
				return t;
			case 26: return Gc(e, t), e === null ? (n = Nm(t.type, null, t.pendingProps, null)) ? t.memoizedState = n : B || (t.stateNode = fp(t.type, t.pendingProps, Te.current, t)) : t.memoizedState = Nm(t.type, e.memoizedProps, t.pendingProps, e.memoizedState), null;
			case 27: return ke(t), e === null && B && (r = t.stateNode = hm(t.type, t.pendingProps, Te.current), ia = t, oa = !0, i = z, Sp(t.type) ? (um = i, z = lm(r.firstChild)) : z = i), Fc(e, t, t.pendingProps.children, n), Gc(e, t), e === null && (t.flags |= 4194304), t.child;
			case 5: return e === null && B && ((i = r = z) && (r = rm(r, t.type, t.pendingProps, oa), r === null ? i = !1 : (t.stateNode = r, ia = t, z = lm(r.firstChild), oa = !1, i = !0)), i || ca(t)), ke(t), i = t.type, a = t.pendingProps, o = e === null ? null : e.memoizedProps, r = a.children, pp(i, a) ? r = null : o !== null && pp(i, o) && (t.flags |= 32), t.memoizedState !== null && (i = $o(e, t, ns, null, null, n), sh._currentValue = i), Gc(e, t), Fc(e, t, r, n), t.child;
			case 6: return e === null && B && ((e = n = z) && (n = im(n, t.pendingProps, oa), n === null ? e = !1 : (t.stateNode = n, ia = t, z = null, e = !0)), e || ca(t)), null;
			case 13: return $c(e, t, n);
			case 4: return De(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = fo(t, null, r, n) : Fc(e, t, r, n), t.child;
			case 11: return Ic(e, t, t.type, t.pendingProps, n);
			case 7: return r = t.pendingProps, Gc(e, t), Fc(e, t, r, n), t.child;
			case 8: return Fc(e, t, t.pendingProps.children, n), t.child;
			case 12: return Fc(e, t, t.pendingProps.children, n), t.child;
			case 10: return ll(e, t, n);
			case 9: return i = t.type._context, r = t.pendingProps.children, wa(t), i = Ta(i), r = r(i), t.flags |= 1, Fc(e, t, r, n), t.child;
			case 14: return Lc(e, t, t.type, t.pendingProps, n);
			case 15: return Rc(e, t, t.type, t.pendingProps, n);
			case 19: return cl(e, t, n);
			case 31: return Wc(e, t, n);
			case 22: return zc(e, t, n, t.pendingProps);
			case 24: return wa(t), r = Ta(ja), e === null ? (i = Ka(), i === null && (i = q, a = Ma(), i.pooledCache = a, a.refCount++, a !== null && (i.pooledCacheLanes |= n), i = a), t.memoizedState = {
				parent: r,
				cache: i
			}, ho(t), va(t, ja, i)) : ((e.lanes & n) !== 0 && (go(e, t), Co(t, null, null, n), So()), i = e.memoizedState, a = t.memoizedState, i.parent === r ? (r = a.cache, va(t, ja, r), r !== i.cache && xa(t, [ja], n, !0)) : (i = {
				parent: r,
				cache: r
			}, t.memoizedState = i, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = i), va(t, ja, r))), Fc(e, t, t.pendingProps.children, n), t.child;
			case 30: return t.stateNode === null && (t.stateNode = {
				autoName: null,
				paired: null,
				clones: null,
				ref: null
			}), r = t.pendingProps, r.name != null && r.name !== "auto" ? t.flags |= e === null ? 18882560 : 18874368 : B && ta(t), e !== null && e.memoizedProps.name !== r.name ? t.flags |= 4194816 : Gc(e, t), Fc(e, t, r.children, n), t.child;
			case 29: throw t.pendingProps;
		}
		throw Error(s(156, t.tag));
	}
	function ml(e) {
		e.flags |= 4;
	}
	function hl(e, t, n, r, i) {
		var a;
		if ((a = !!(e.mode & 32)) && (a = n === null ? Jm(t, r) : Jm(t, r) && (r.src !== n.src || r.srcSet !== n.srcSet)), a) {
			if (e.flags |= 16777216, (i & 335544128) === i) {
				if (e.stateNode.complete) e.flags |= 8192;
				else if (Ud()) e.flags |= 8192;
				else throw no = Qa, Xa;
			}
		} else e.flags &= -16777217;
	}
	function gl(e, t) {
		if (t.type !== "stylesheet" || t.state.loading & 4) e.flags &= -16777217;
		else if (e.flags |= 16777216, !Ym(t)) {
			if (Ud()) e.flags |= 8192;
			else throw no = Qa, Xa;
		}
	}
	function _l(e, t) {
		t !== null && (e.flags |= 4), e.flags & 16384 && (t = e.tag === 22 ? 536870912 : ft(), e.lanes |= t, ud |= t);
	}
	function vl(e, t) {
		if (!B) switch (e.tailMode) {
			case "visible": break;
			case "collapsed":
				for (var n = e.tail, r = null; n !== null;) n.alternate !== null && (r = n), n = n.sibling;
				r === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : r.sibling = null;
				break;
			default:
				for (t = e.tail, n = null; t !== null;) t.alternate !== null && (n = t), t = t.sibling;
				n === null ? e.tail = null : n.sibling = null;
		}
	}
	function U(e) {
		var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
		if (t) for (var i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags & 1206910976, r |= i.flags & 1206910976, i.return = e, i = i.sibling;
		else for (i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags, r |= i.flags, i.return = e, i = i.sibling;
		return e.subtreeFlags |= r, e.childLanes = n, t;
	}
	function yl(e, t, n) {
		var r = t.pendingProps;
		switch (na(t), t.tag) {
			case 16:
			case 15:
			case 0:
			case 11:
			case 7:
			case 8:
			case 12:
			case 9:
			case 14: return U(t), null;
			case 1: return U(t), null;
			case 3: return n = t.stateNode, r = null, e !== null && (r = e.memoizedState.cache), t.memoizedState.cache !== r && (t.flags |= 2048), ya(ja), Oe(), n.pendingContext && (n.context = n.pendingContext, n.pendingContext = null), (e === null || e.child === null) && (da(t) ? ml(t) : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, pa())), U(t), null;
			case 26:
				var i = t.type, a = t.memoizedState;
				return e === null ? (ml(t), a === null ? (U(t), hl(t, i, null, r, n)) : (U(t), gl(t, a))) : a ? a === e.memoizedState ? (U(t), t.flags &= -16777217) : (ml(t), U(t), gl(t, a)) : (e = e.memoizedProps, e !== r && ml(t), U(t), hl(t, i, e, r, n)), null;
			case 27:
				if (Ae(t), n = Te.current, i = t.type, e !== null && t.stateNode != null) e.memoizedProps !== r && ml(t);
				else {
					if (!r) {
						if (t.stateNode === null) throw Error(s(166));
						return U(t), t.subtreeFlags &= -33554433, null;
					}
					e = Ce.current, da(t) ? la(t, e) : (e = hm(i, r, n), t.stateNode = e, ml(t));
				}
				return U(t), t.subtreeFlags &= -33554433, null;
			case 5:
				if (Ae(t), i = t.type, e !== null && t.stateNode != null) e.memoizedProps !== r && ml(t);
				else {
					if (!r) {
						if (t.stateNode === null) throw Error(s(166));
						return U(t), t.subtreeFlags &= -33554433, null;
					}
					if (a = Ce.current, da(t)) la(t, a);
					else {
						var o = lp(Te.current);
						switch (a) {
							case 1:
								a = o.createElementNS("http://www.w3.org/2000/svg", i);
								break;
							case 2:
								a = o.createElementNS("http://www.w3.org/1998/Math/MathML", i);
								break;
							default: switch (i) {
								case "svg":
									a = o.createElementNS("http://www.w3.org/2000/svg", i);
									break;
								case "math":
									a = o.createElementNS("http://www.w3.org/1998/Math/MathML", i);
									break;
								case "script":
									a = o.createElement("div"), a.innerHTML = "<script><\/script>", a = a.removeChild(a.firstChild);
									break;
								case "select":
									a = typeof r.is == "string" ? o.createElement("select", { is: r.is }) : o.createElement("select"), r.multiple ? a.multiple = !0 : r.size && (a.size = r.size);
									break;
								default: a = typeof r.is == "string" ? o.createElement(i, { is: r.is }) : o.createElement(i);
							}
						}
						a[wt] = t, a[Tt] = r;
						a: for (o = t.child; o !== null;) {
							if (o.tag === 5 || o.tag === 6) a.appendChild(o.stateNode);
							else if (o.tag !== 4 && o.tag !== 27 && o.child !== null) {
								o.child.return = o, o = o.child;
								continue;
							}
							if (o === t) break a;
							for (; o.sibling === null;) {
								if (o.return === null || o.return === t) break a;
								o = o.return;
							}
							o.sibling.return = o.return, o = o.sibling;
						}
						t.stateNode = a;
						a: switch (np(a, i, r), i) {
							case "button":
							case "input":
							case "select":
							case "textarea":
								r = !!r.autoFocus;
								break a;
							case "img":
								r = !0;
								break a;
							default: r = !1;
						}
						r && ml(t);
					}
				}
				return U(t), t.subtreeFlags &= -33554433, hl(t, t.type, e === null ? null : e.memoizedProps, t.pendingProps, n), null;
			case 6:
				if (e && t.stateNode != null) e.memoizedProps !== r && ml(t);
				else {
					if (typeof r != "string" && t.stateNode === null) throw Error(s(166));
					if (e = Te.current, da(t)) {
						if (e = t.stateNode, n = t.memoizedProps, r = null, i = ia, i !== null) switch (i.tag) {
							case 27:
							case 5: r = i.memoizedProps;
						}
						e[wt] = t, e = !!(e.nodeValue === n || r !== null && !0 === r.suppressHydrationWarning || ep(e.nodeValue, n)), e || ca(t, !0);
					} else e = lp(e).createTextNode(r), e[wt] = t, t.stateNode = e;
				}
				return U(t), null;
			case 31:
				if (n = t.memoizedState, e === null || e.memoizedState !== null) {
					if (r = da(t), n !== null) {
						if (e === null) {
							if (!r) throw Error(s(318));
							if (e = t.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(s(557));
							e[wt] = t;
						} else fa(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
						U(t), e = !1;
					} else n = pa(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = n), e = !0;
					if (!e) return t.flags & 256 ? (Lo(t), t) : (Lo(t), null);
					if (t.flags & 128) throw Error(s(558));
				}
				return U(t), null;
			case 13:
				if (r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
					if (i = da(t), r !== null && r.dehydrated !== null) {
						if (e === null) {
							if (!i) throw Error(s(318));
							if (i = t.memoizedState, i = i === null ? null : i.dehydrated, !i) throw Error(s(317));
							i[wt] = t;
						} else fa(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
						U(t), i = !1;
					} else i = pa(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = i), i = !0;
					if (!i) return t.flags & 256 ? (Lo(t), t) : (Lo(t), null);
				}
				return Lo(t), t.flags & 128 ? (t.lanes = n, t) : (n = r !== null, e = e !== null && e.memoizedState !== null, n && (r = t.child, i = null, r.alternate !== null && r.alternate.memoizedState !== null && r.alternate.memoizedState.cachePool !== null && (i = r.alternate.memoizedState.cachePool.pool), a = null, r.memoizedState !== null && r.memoizedState.cachePool !== null && (a = r.memoizedState.cachePool.pool), a !== i && (r.flags |= 2048)), n !== e && n && (t.child.flags |= 8192), _l(t, t.updateQueue), U(t), null);
			case 4: return Oe(), e === null && Wf(t.stateNode.containerInfo), t.flags |= 67108864, U(t), null;
			case 10: return ya(t.type), U(t), null;
			case 19:
				if (Bo(t), r = t.memoizedState, r === null) return U(t), null;
				if (i = !!(t.flags & 128), a = r.rendering, a === null) {
					if (i) vl(r, !1);
					else {
						if (ad !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null;) {
							if (a = Vo(e), a !== null) {
								for (t.flags |= 128, vl(r, !1), e = a.updateQueue, t.updateQueue = e, _l(t, e), t.subtreeFlags = 0, e = n, n = t.child; n !== null;) Ii(n, e), n = n.sibling;
								return zo(t, Ro.current & 1 | 2), B && $i(t, r.treeForkCount), t.child;
							}
							e = e.sibling;
						}
						r.tail !== null && He() > gd && (t.flags |= 128, i = !0, vl(r, !1), t.lanes = 4194304);
					}
				} else {
					if (!i) {
						if (e = Vo(a), e !== null) {
							if (t.flags |= 128, i = !0, e = e.updateQueue, t.updateQueue = e, _l(t, e), vl(r, !0), r.tail === null && r.tailMode !== "collapsed" && r.tailMode !== "visible" && !a.alternate && !B) return U(t), null;
						} else 2 * He() - r.renderingStartTime > gd && n !== 536870912 && (t.flags |= 128, i = !0, vl(r, !1), t.lanes = 4194304);
					}
					r.isBackwards ? (a.sibling = t.child, t.child = a) : (e = r.last, e === null ? t.child = a : e.sibling = a, r.last = a);
				}
				if (r.tail !== null) {
					e = r.tail;
					a: {
						for (n = e; n !== null;) {
							if (n.alternate !== null) {
								n = !1;
								break a;
							}
							n = n.sibling;
						}
						n = !0;
					}
					return r.rendering = e, r.tail = e.sibling, r.renderingStartTime = He(), e.sibling = null, a = Ro.current, a = i ? a & 1 | 2 : a & 1, r.tailMode === "visible" || r.tailMode === "collapsed" || !n || B ? zo(t, a) : (n = a, F(jo, t), F(Ro, n), Mo === null && (Mo = t)), B && $i(t, r.treeForkCount), e;
				}
				return U(t), null;
			case 22:
			case 23: return Lo(t), Ao(), r = t.memoizedState !== null, e === null ? r && (t.flags |= 8192) : e.memoizedState !== null !== r && (t.flags |= 8192), r ? n & 536870912 && !(t.flags & 128) && (U(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : U(t), n = t.updateQueue, n !== null && _l(t, n.retryQueue), n = null, e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), r = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (r = t.memoizedState.cachePool.pool), r !== n && (t.flags |= 2048), e !== null && Se(Ga), null;
			case 24: return n = null, e !== null && (n = e.memoizedState.cache), t.memoizedState.cache !== n && (t.flags |= 2048), ya(ja), U(t), null;
			case 25: return null;
			case 30: return t.flags |= 33554432, U(t), null;
		}
		throw Error(s(156, t.tag));
	}
	function bl(e, t) {
		switch (na(t), t.tag) {
			case 1: return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 3: return ya(ja), Oe(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
			case 26:
			case 27:
			case 5: return Ae(t), null;
			case 31:
				if (t.memoizedState !== null) {
					if (Lo(t), t.alternate === null) throw Error(s(340));
					fa();
				}
				return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 13:
				if (Lo(t), e = t.memoizedState, e !== null && e.dehydrated !== null) {
					if (t.alternate === null) throw Error(s(340));
					fa();
				}
				return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 19: return Bo(t), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, e = t.memoizedState, e !== null && (e.rendering = null, e.tail = null), t.flags |= 4, t) : null;
			case 4: return Oe(), null;
			case 10: return ya(t.type), null;
			case 22:
			case 23: return Lo(t), Ao(), e !== null && Se(Ga), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 24: return ya(ja), null;
			case 25: return null;
			default: return null;
		}
	}
	function xl(e, t) {
		switch (na(t), t.tag) {
			case 3:
				ya(ja), Oe();
				break;
			case 26:
			case 27:
			case 5:
				Ae(t);
				break;
			case 4:
				Oe();
				break;
			case 31:
				t.memoizedState !== null && Lo(t);
				break;
			case 13:
				Lo(t);
				break;
			case 19:
				Bo(t);
				break;
			case 10:
				ya(t.type);
				break;
			case 22:
			case 23:
				Lo(t), Ao(), e !== null && Se(Ga);
				break;
			case 24: ya(ja);
		}
	}
	function Sl(e, t) {
		try {
			var n = t.updateQueue, r = n === null ? null : n.lastEffect;
			if (r !== null) {
				var i = r.next;
				n = i;
				do {
					if ((n.tag & e) === e) {
						r = void 0;
						var a = n.create, o = n.inst;
						r = a(), o.destroy = r;
					}
					n = n.next;
				} while (n !== i);
			}
		} catch (e) {
			Z(t, t.return, e);
		}
	}
	function Cl(e, t, n) {
		try {
			var r = t.updateQueue, i = r === null ? null : r.lastEffect;
			if (i !== null) {
				var a = i.next;
				r = a;
				do {
					if ((r.tag & e) === e) {
						var o = r.inst, s = o.destroy;
						if (s !== void 0) {
							o.destroy = void 0, i = t;
							var c = n, l = s;
							try {
								l();
							} catch (e) {
								Z(i, c, e);
							}
						}
					}
					r = r.next;
				} while (r !== a);
			}
		} catch (e) {
			Z(t, t.return, e);
		}
	}
	function wl(e) {
		var t = e.updateQueue;
		if (t !== null) {
			var n = e.stateNode;
			try {
				To(t, n);
			} catch (t) {
				Z(e, e.return, t);
			}
		}
	}
	function Tl(e, t, n) {
		n.props = Cc(e.type, e.memoizedProps), n.state = e.memoizedState;
		try {
			n.componentWillUnmount();
		} catch (n) {
			Z(e, t, n);
		}
	}
	function El(e, t) {
		try {
			var n = e.ref;
			if (n !== null) {
				switch (e.tag) {
					case 26:
					case 27:
					case 5:
						var r = e.stateNode;
						break;
					case 30:
						var i = e.stateNode, a = vi(e.memoizedProps, i);
						(i.ref === null || i.ref.name !== a) && (i.ref = Pp(a)), r = i.ref;
						break;
					case 7:
						if (e.stateNode === null) {
							var o = new Fp(e);
							h(e.child, !1, Qp, o, void 0, void 0), e.stateNode = o;
						}
						r = e.stateNode;
						break;
					default: r = e.stateNode;
				}
				typeof n == "function" ? e.refCleanup = n(r) : n.current = r;
			}
		} catch (n) {
			Z(e, t, n);
		}
	}
	function Dl(e, t) {
		var n = e.ref, r = e.refCleanup;
		if (n !== null) {
			if (typeof r == "function") try {
				r();
			} catch (n) {
				Z(e, t, n);
			} finally {
				e.refCleanup = null, e = e.alternate, e != null && (e.refCleanup = null);
			}
			else if (typeof n == "function") try {
				n(null);
			} catch (n) {
				Z(e, t, n);
			}
			else n.current = null;
		}
	}
	function Ol(e, t) {
		if ((e.tag === 5 || e.tag === 27 || e.tag === 6) && e.alternate === null && t !== null) for (var n = 0; n < t.length; n++) em(e.stateNode, t[n]);
	}
	function kl(e) {
		for (var t = e.return; t !== null && (Ml(t) && em(e.stateNode, t.stateNode), !jl(t));) t = t.return;
	}
	function Al(e) {
		for (var t = e.return; t !== null && (Ml(t) && tm(e.stateNode, t.stateNode), !jl(t));) t = t.return;
	}
	function jl(e) {
		return e.tag === 5 || e.tag === 3 || e.tag === 27;
	}
	function Ml(e) {
		return e && e.tag === 7 && e.stateNode !== null;
	}
	function Nl(e) {
		var t = e.type, n = e.memoizedProps, r = e.stateNode;
		try {
			a: switch (t) {
				case "button":
				case "input":
				case "select":
				case "textarea":
					n.autoFocus && r.focus();
					break a;
				case "img": n.src ? r.src = n.src : n.srcSet && (r.srcset = n.srcSet);
			}
		} catch (t) {
			Z(e, e.return, t);
		}
	}
	function Pl(e, t, n) {
		try {
			var r = e.stateNode;
			ip(r, e.type, n, t), r[Tt] = t;
		} catch (t) {
			Z(e, e.return, t);
		}
	}
	function Fl(e) {
		return e.tag === 5 || e.tag === 3 || e.tag === 26 || e.tag === 27 && Sp(e.type) || e.tag === 4;
	}
	function Il(e) {
		a: for (;;) {
			for (; e.sibling === null;) {
				if (e.return === null || Fl(e.return)) return null;
				e = e.return;
			}
			for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18;) {
				if (e.tag === 27 && Sp(e.type) || e.flags & 2 || e.child === null || e.tag === 4) continue a;
				e.child.return = e, e = e.child;
			}
			if (!(e.flags & 2)) return e.stateNode;
		}
	}
	function Ll(e, t, n, r) {
		var i = e.tag;
		if (i === 5 || i === 6) i = e.stateNode, t ? (n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n).insertBefore(i, t) : (t = n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n, t.appendChild(i), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = bn)), Ol(e, r), L = !0;
		else if (i !== 4 && (i === 27 && (Ol(e, r), r = null, Sp(e.type) && (n = e.stateNode, t = null)), e = e.child, e !== null)) for (Ll(e, t, n, r), e = e.sibling; e !== null;) Ll(e, t, n, r), e = e.sibling;
	}
	function Rl(e, t, n, r) {
		var i = e.tag;
		if (i === 5 || i === 6) i = e.stateNode, t ? n.insertBefore(i, t) : n.appendChild(i), Ol(e, r), L = !0;
		else if (i !== 4 && (i === 27 && (Ol(e, r), r = null, Sp(e.type) && (n = e.stateNode)), e = e.child, e !== null)) for (Rl(e, t, n, r), e = e.sibling; e !== null;) Rl(e, t, n, r), e = e.sibling;
	}
	function zl(e) {
		var t = e.stateNode, n = e.memoizedProps;
		try {
			for (var r = e.type, i = t.attributes; i.length;) t.removeAttributeNode(i[0]);
			np(t, r, n), t[wt] = e, t[Tt] = n;
		} catch (t) {
			Z(e, e.return, t);
		}
	}
	var Bl = !1, Vl = null;
	function Hl(e) {
		(e.tag === 30 || e.subtreeFlags & 33554432) && (Bl = !0);
	}
	var Ul = null;
	function Wl() {
		var e = Ul;
		return Ul = null, e;
	}
	var Gl = 0;
	function Kl(e, t, n, r, i) {
		return Gl = 0, ql(e.child, t, n, r, i);
	}
	function ql(e, t, n, r, i) {
		for (var a = !1; e !== null;) {
			if (e.tag === 5) {
				var o = e.stateNode;
				if (r !== null) {
					var s = Op(o);
					r.push(s), s.view && (a = !0);
				} else a || Op(o).view && (a = !0);
				Bl = !0, Tp(o, Gl === 0 ? t : t + "_" + Gl, n), Gl++;
			} else e.tag === 22 && e.memoizedState !== null || e.tag === 30 && i || ql(e.child, t, n, r, i) && (a = !0);
			e = e.sibling;
		}
		return a;
	}
	function Jl(e, t) {
		for (; e !== null;) e.tag === 5 ? Ep(e.stateNode, e.memoizedProps) : e.tag === 22 && e.memoizedState !== null || e.tag === 30 && t || Jl(e.child, t), e = e.sibling;
	}
	function Yl(e) {
		if (e.subtreeFlags & 18874368) for (e = e.child; e !== null;) {
			if ((e.tag !== 22 || e.memoizedState === null) && (Yl(e), e.tag === 30 && e.flags & 18874368 && e.stateNode.paired)) {
				var t = e.memoizedProps;
				if (t.name == null || t.name === "auto") throw Error(s(544));
				var n = t.name;
				t = bi(t.default, t.share), t !== "none" && (Kl(e, n, t, null, !1) || Jl(e.child, !1));
			}
			e = e.sibling;
		}
	}
	function Xl(e, t) {
		if (e.tag === 30) {
			var n = e.stateNode, r = e.memoizedProps, i = vi(r, n), a = bi(r.default, n.paired ? r.share : r.enter);
			a === "none" ? Yl(e) : Kl(e, i, a, null, !1) ? (Yl(e), n.paired || t || Nd(e, r.onEnter)) : Jl(e.child, !1);
		} else if (e.subtreeFlags & 33554432) for (e = e.child; e !== null;) Xl(e, t), e = e.sibling;
		else Yl(e);
	}
	function Zl(e) {
		if (Vl !== null && Vl.size !== 0) {
			var t = Vl;
			if (e.subtreeFlags & 18874368) for (e = e.child; e !== null;) {
				if (e.tag !== 22 || e.memoizedState === null) {
					if (e.tag === 30 && e.flags & 18874368) {
						var n = e.memoizedProps, r = n.name;
						if (r != null && r !== "auto") {
							var i = t.get(r);
							if (i !== void 0) {
								var a = bi(n.default, n.share);
								if (a !== "none" && (Kl(e, r, a, null, !1) ? (a = e.stateNode, i.paired = a, a.paired = i, Nd(e, n.onShare)) : Jl(e.child, !1)), t.delete(r), t.size === 0) break;
							}
						}
					}
					Zl(e);
				}
				e = e.sibling;
			}
		}
	}
	function Ql(e) {
		if (e.tag === 30) {
			var t = e.memoizedProps, n = vi(t, e.stateNode), r = Vl === null ? void 0 : Vl.get(n), i = bi(t.default, r === void 0 ? t.exit : t.share);
			i !== "none" && (Kl(e, n, i, null, !1) ? r === void 0 ? Nd(e, t.onExit) : (i = e.stateNode, r.paired = i, i.paired = r, Vl.delete(n), Nd(e, t.onShare)) : Jl(e.child, !1)), Vl !== null && Zl(e);
		} else if (e.subtreeFlags & 33554432) for (e = e.child; e !== null;) Ql(e), e = e.sibling;
		else Vl !== null && Zl(e);
	}
	function $l(e) {
		for (e = e.child; e !== null;) {
			if (e.tag === 30) {
				var t = e.memoizedProps, n = vi(t, e.stateNode);
				t = bi(t.default, t.update), e.flags &= -5, t !== "none" && Kl(e, n, t, e.memoizedState = [], !1);
			} else e.subtreeFlags & 33554432 && $l(e);
			e = e.sibling;
		}
	}
	function eu(e) {
		if (e.subtreeFlags & 18874368) for (e = e.child; e !== null;) {
			if (e.tag !== 22 || e.memoizedState === null) {
				if (e.tag === 30 && e.flags & 18874368) {
					var t = e.stateNode;
					t.paired !== null && (t.paired = null, Jl(e.child, !1));
				}
				eu(e);
			}
			e = e.sibling;
		}
	}
	function tu(e) {
		if (e.tag === 30) e.stateNode.paired = null, Jl(e.child, !1), eu(e);
		else if (e.subtreeFlags & 33554432) for (e = e.child; e !== null;) tu(e), e = e.sibling;
		else eu(e);
	}
	function nu(e) {
		for (e = e.child; e !== null;) e.tag === 30 ? Jl(e.child, !1) : e.subtreeFlags & 33554432 && nu(e), e = e.sibling;
	}
	function ru(e, t, n, r, i, a, o) {
		for (var s = !1; t !== null;) {
			if (t.tag === 5) {
				var c = t.stateNode;
				if (a !== null && Gl < a.length) {
					var l = a[Gl], u = Op(c);
					(l.view || u.view) && (s = !0);
					var d;
					if (d = !(e.flags & 4)) {
						if (u.clip) d = !0;
						else {
							d = l.rect;
							var f = u.rect;
							d = d.y !== f.y || d.x !== f.x || d.height !== f.height || d.width !== f.width;
						}
					}
					d && (e.flags |= 4), u.abs ? u = !l.abs : (l = l.rect, u = u.rect, u = l.height !== u.height || l.width !== u.width), u && (e.flags |= 32);
				} else e.flags |= 32;
				e.flags & 4 && Tp(c, Gl === 0 ? n : n + "_" + Gl, i), s && e.flags & 4 || (Ul === null && (Ul = []), Ul.push(c, Gl === 0 ? r : r + "_" + Gl, t.memoizedProps)), Gl++;
			} else (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && o ? e.flags |= t.flags & 32 : ru(e, t.child, n, r, i, a, o) && (s = !0));
			t = t.sibling;
		}
		return s;
	}
	function iu(e, t) {
		for (e = e.child; e !== null;) {
			if (e.tag === 30) {
				var n = e.memoizedProps, r = e.stateNode, i = vi(n, r), a = bi(n.default, n.update);
				if (t) {
					r = r.clones;
					var o = r === null ? null : r.map(kp);
				} else o = e.memoizedState, e.memoizedState = null;
				r = e;
				var s = e.child;
				Gl = 0, i = ru(r, s, i, i, a, o, !1), e.flags & 4 && i && (t || Nd(e, n.onUpdate));
			} else e.subtreeFlags & 33554432 && iu(e, t);
			e = e.sibling;
		}
	}
	var au = !1, W = !1, ou = !1, su = !1, cu = typeof WeakSet == "function" ? WeakSet : Set, lu = null, uu = !1, du = !1, fu = !1, pu = !1;
	function mu(e, t, n) {
		if (e = e.containerInfo, sp = gh, e = Jr(e), Yr(e)) {
			if ("selectionStart" in e) var r = {
				start: e.selectionStart,
				end: e.selectionEnd
			};
			else a: {
				r = (r = e.ownerDocument) && r.defaultView || window;
				var i = r.getSelection && r.getSelection();
				if (i && i.rangeCount !== 0) {
					r = i.anchorNode;
					var a = i.anchorOffset, o = i.focusNode;
					i = i.focusOffset;
					try {
						r.nodeType, o.nodeType;
					} catch {
						r = null;
						break a;
					}
					var s = 0, c = -1, l = -1, u = 0, d = 0, f = e, p = null;
					b: for (;;) {
						for (var m; f !== r || a !== 0 && f.nodeType !== 3 || (c = s + a), f !== o || i !== 0 && f.nodeType !== 3 || (l = s + i), f.nodeType === 3 && (s += f.nodeValue.length), (m = f.firstChild) !== null;) p = f, f = m;
						for (;;) {
							if (f === e) break b;
							if (p === r && ++u === a && (c = s), p === o && ++d === i && (l = s), (m = f.nextSibling) !== null) break;
							f = p, p = f.parentNode;
						}
						f = m;
					}
					r = c === -1 || l === -1 ? null : {
						start: c,
						end: l
					};
				} else r = null;
			}
			r = r || {
				start: 0,
				end: 0
			};
		} else r = null;
		for (cp = {
			focusedElem: e,
			selectionRange: r
		}, gh = !1, n = (n & 335544064) === n, lu = t, t = n ? 9270 : 1024; lu !== null;) {
			if (e = lu, n && (r = e.deletions, r !== null)) for (a = 0; a < r.length; a++) n && Ql(r[a]);
			if (e.alternate === null && e.flags & 2) n && Hl(e), hu(n);
			else {
				if (e.tag === 22) {
					if (r = e.alternate, e.memoizedState !== null) {
						r !== null && r.memoizedState === null && n && Ql(r), hu(n);
						continue;
					}
					if (r !== null && r.memoizedState !== null) {
						n && Hl(e), hu(n);
						continue;
					}
				}
				r = e.child, (e.subtreeFlags & t) !== 0 && r !== null ? (r.return = e, lu = r) : (n && $l(e), hu(n));
			}
		}
		Vl = null;
	}
	function hu(e) {
		for (; lu !== null;) {
			var t = lu, n = e, r = t.alternate, i = t.flags;
			switch (t.tag) {
				case 0:
				case 11:
				case 15: break;
				case 1:
					if (i & 1024 && r !== null) {
						n = void 0, i = r.memoizedProps, r = r.memoizedState;
						var a = t.stateNode;
						try {
							var o = Cc(t.type, i);
							n = a.getSnapshotBeforeUpdate(o, r), a.__reactInternalSnapshotBeforeUpdate = n;
						} catch (e) {
							Z(t, t.return, e);
						}
					}
					break;
				case 3:
					if (i & 1024) {
						if (r = t.stateNode.containerInfo, n = r.nodeType, n === 9) nm(r);
						else if (n === 1) switch (r.nodeName) {
							case "HEAD":
							case "HTML":
							case "BODY":
								nm(r);
								break;
							default: r.textContent = "";
						}
					}
					break;
				case 5:
				case 26:
				case 27:
				case 6:
				case 4:
				case 17: break;
				case 30:
					n && r !== null && (n = vi(r.memoizedProps, r.stateNode), i = t.memoizedProps, i = bi(i.default, i.update), i !== "none" && Kl(r, n, i, r.memoizedState = [], !0));
					break;
				default: if (i & 1024) throw Error(s(163));
			}
			if (r = t.sibling, r !== null) {
				r.return = t.return, lu = r;
				break;
			}
			lu = t.return;
		}
	}
	function gu(e, t, n) {
		var r = n.flags;
		switch (n.tag) {
			case 0:
			case 11:
			case 15:
				Fu(e, n), r & 4 && Sl(5, n);
				break;
			case 1:
				if (Fu(e, n), r & 4) {
					if (e = n.stateNode, t === null) try {
						e.componentDidMount();
					} catch (e) {
						Z(n, n.return, e);
					}
					else {
						var i = Cc(n.type, t.memoizedProps);
						t = t.memoizedState;
						try {
							e.componentDidUpdate(i, t, e.__reactInternalSnapshotBeforeUpdate);
						} catch (e) {
							Z(n, n.return, e);
						}
					}
				}
				r & 64 && wl(n), r & 512 && El(n, n.return);
				break;
			case 3:
				if (Fu(e, n), r & 64 && (e = n.updateQueue, e !== null)) {
					if (t = null, n.child !== null) switch (n.child.tag) {
						case 27:
						case 5:
							t = n.child.stateNode;
							break;
						case 1: t = n.child.stateNode;
					}
					try {
						To(e, t);
					} catch (e) {
						Z(n, n.return, e);
					}
				}
				break;
			case 27: t === null && r & 4 && zl(n);
			case 26:
			case 5:
				Fu(e, n), t === null && r & 4 && Nl(n), r & 512 && El(n, n.return);
				break;
			case 12:
				Fu(e, n);
				break;
			case 31:
				Fu(e, n), r & 4 && wu(e, n);
				break;
			case 13:
				Fu(e, n), r & 4 && Tu(e, n), r & 64 && (e = n.memoizedState, e !== null && (e = e.dehydrated, e !== null && (n = _f.bind(null, n), cm(e, n))));
				break;
			case 22:
				if (r = n.memoizedState !== null || au, !r) {
					var a = t !== null && t.memoizedState !== null || W;
					t = au, i = W, au = r, (W = a) && !i ? (r = 2, n.subtreeFlags & 8772 && (r |= 1), Lu(e, n, r)) : Fu(e, n), au = t, W = i;
				}
				break;
			case 30:
				Fu(e, n), r & 512 && El(n, n.return);
				break;
			case 7: r & 512 && El(n, n.return);
			default: Fu(e, n);
		}
	}
	function _u(e, t) {
		for (e = e.child; e !== null;) vu(e, t), e = e.sibling;
	}
	function vu(e, t) {
		switch (e.tag) {
			case 5:
			case 26:
				try {
					var n = e.stateNode;
					if (t) {
						var r = n.style;
						typeof r.setProperty == "function" ? r.setProperty("display", "none", "important") : r.display = "none";
					} else {
						var i = e.stateNode, a = e.memoizedProps.style, o = a != null && a.hasOwnProperty("display") ? a.display : null;
						i.style.display = o == null || typeof o == "boolean" ? "" : ("" + o).trim();
					}
				} catch (t) {
					Z(e, e.return, t);
				}
				yu(e, t);
				break;
			case 6:
				try {
					e.stateNode.nodeValue = t ? "" : e.memoizedProps, L = !0;
				} catch (t) {
					Z(e, e.return, t);
				}
				break;
			case 18:
				try {
					var s = e.stateNode;
					t ? wp(s, !0) : wp(e.stateNode, !1);
				} catch (t) {
					Z(e, e.return, t);
				}
				break;
			case 22:
			case 23:
				e.memoizedState === null && _u(e, t);
				break;
			default: _u(e, t);
		}
	}
	function yu(e, t) {
		if (e.subtreeFlags & 67108864) for (e = e.child; e !== null;) {
			a: {
				var n = e, r = t;
				switch (n.tag) {
					case 4:
						vu(n, r);
						break a;
					case 22:
						n.memoizedState === null && yu(n, r);
						break a;
					default: yu(n, r);
				}
			}
			e = e.sibling;
		}
	}
	function bu(e) {
		var t = e.alternate;
		t !== null && (e.alternate = null, bu(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && Nt(t)), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
	}
	var G = null, xu = !1;
	function Su(e, t, n) {
		for (n = n.child; n !== null;) Cu(e, t, n), n = n.sibling;
	}
	function Cu(e, t, n) {
		if (Qe && typeof Qe.onCommitFiberUnmount == "function") try {
			Qe.onCommitFiberUnmount(Ze, n);
		} catch {}
		switch (n.tag) {
			case 26:
				W || Dl(n, t), Su(e, t, n), n.memoizedState ? n.memoizedState.count-- : n.stateNode && !W && (n = n.stateNode, n.parentNode.removeChild(n));
				break;
			case 27:
				W || Dl(n, t), Al(n);
				var r = G, i = xu;
				Sp(n.type) && (G = n.stateNode, xu = !1), Su(e, t, n), gm(n.stateNode, n.type, n.memoizedProps), G = r, xu = i;
				break;
			case 5: W || Dl(n, t), Al(n);
			case 6:
				if (n.tag === 6 && Al(n), r = G, i = xu, G = null, Su(e, t, n), G = r, xu = i, G !== null) {
					if (xu) try {
						(G.nodeType === 9 ? G.body : G.nodeName === "HTML" ? G.ownerDocument.body : G).removeChild(n.stateNode), L = !0;
					} catch (e) {
						Z(n, t, e);
					}
					else try {
						G.removeChild(n.stateNode), L = !0;
					} catch (e) {
						Z(n, t, e);
					}
				}
				break;
			case 18:
				G !== null && (xu ? (e = G, Cp(e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e, n.stateNode), Hh(e)) : Cp(G, n.stateNode));
				break;
			case 4:
				r = G, i = xu, G = n.stateNode.containerInfo, xu = !0, Su(e, t, n), G = r, xu = i;
				break;
			case 0:
			case 11:
			case 14:
			case 15:
				Cl(2, n, t), W || Cl(4, n, t), Su(e, t, n);
				break;
			case 1:
				W || (Dl(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function" && Tl(n, t, r)), Su(e, t, n);
				break;
			case 21:
				Su(e, t, n);
				break;
			case 22:
				W = (r = W) || n.memoizedState !== null, Su(e, t, n), W = r;
				break;
			case 30:
				Dl(n, t), Su(e, t, n);
				break;
			case 7:
				W || Dl(n, t), Su(e, t, n);
				break;
			default: Su(e, t, n);
		}
	}
	function wu(e, t) {
		if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null))) {
			e = e.dehydrated;
			try {
				Hh(e);
			} catch (e) {
				Z(t, t.return, e);
			}
		}
	}
	function Tu(e, t) {
		if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null && (e = e.dehydrated, e !== null)))) try {
			Hh(e);
		} catch (e) {
			Z(t, t.return, e);
		}
	}
	function Eu(e) {
		switch (e.tag) {
			case 31:
			case 13:
			case 19:
				var t = e.stateNode;
				return t === null && (t = e.stateNode = new cu()), t;
			case 22: return e = e.stateNode, t = e._retryCache, t === null && (t = e._retryCache = new cu()), t;
			default: throw Error(s(435, e.tag));
		}
	}
	function Du(e, t) {
		var n = Eu(e);
		t.forEach(function(t) {
			if (!n.has(t)) {
				n.add(t);
				var r = vf.bind(null, e, t);
				t.then(r, r);
			}
		});
	}
	function Ou(e, t, n) {
		var r = t.deletions;
		if (r !== null) for (var i = 0; i < r.length; i++) {
			var a = r[i], o = e, c = t, l = c;
			a: for (; l !== null;) {
				switch (l.tag) {
					case 27:
						if (Sp(l.type)) {
							G = l.stateNode, xu = !1;
							break a;
						}
						break;
					case 5:
						G = l.stateNode, xu = !1;
						break a;
					case 3:
					case 4:
						G = l.stateNode.containerInfo, xu = !0;
						break a;
				}
				l = l.return;
			}
			if (G === null) throw Error(s(160));
			Cu(o, c, a), G = null, xu = !1, o = a.alternate, o !== null && (o.return = null), a.return = null;
		}
		if (t.subtreeFlags & 13886) for (t = t.child; t !== null;) Au(t, e, n), t = t.sibling;
	}
	var ku = null;
	function Au(e, t, n) {
		var r = e.alternate, i = e.flags;
		switch (e.tag) {
			case 0:
			case 11:
			case 14:
			case 15:
				if (i & 4 && (r = e.updateQueue, r = r === null ? null : r.events, r !== null)) for (var a = 0; a < r.length; a++) {
					var o = r[a];
					o.ref.impl = o.nextImpl;
				}
				Ou(t, e, n), ju(e), i & 4 && (Cl(3, e, e.return), Sl(3, e), Cl(5, e, e.return));
				break;
			case 1:
				Ou(t, e, n), ju(e), i & 512 && (W || r === null || Dl(r, r.return)), i & 64 && au && (e = e.updateQueue, e !== null && (t = e.callbacks, t !== null && (n = e.shared.hiddenCallbacks, e.shared.hiddenCallbacks = n === null ? t : n.concat(t))));
				break;
			case 26:
				if (a = ku, Ou(t, e, n), ju(e), i & 512 && (W || r === null || Dl(r, r.return)), i & 4) {
					if (i = r === null ? null : r.memoizedState, n = e.memoizedState, r === null) {
						if (n === null) {
							if (e.stateNode === null) {
								if (au) e.stateNode = fp(e.type, e.memoizedProps, t.containerInfo, e);
								else {
									a: {
										t = e.type, n = e.memoizedProps, i = a.ownerDocument || a;
										b: switch (t) {
											case "title":
												r = i.getElementsByTagName("title")[0], (!r || r[jt] || r[wt] || r.namespaceURI === "http://www.w3.org/2000/svg" || r.hasAttribute("itemprop")) && (r = i.createElement(t), i.head.insertBefore(r, i.querySelector("head > title"))), np(r, t, n), r[wt] = e, Rt(r), t = r;
												break a;
											case "link":
												if (a = Gm("link", "href", i).get(t + (n.href || ""))) {
													for (o = 0; o < a.length; o++) if (r = a[o], r.getAttribute("href") === (n.href == null || n.href === "" ? null : n.href) && r.getAttribute("rel") === (n.rel == null ? null : n.rel) && r.getAttribute("title") === (n.title == null ? null : n.title) && r.getAttribute("crossorigin") === (n.crossOrigin == null ? null : n.crossOrigin)) {
														a.splice(o, 1);
														break b;
													}
												}
												r = i.createElement(t), np(r, t, n), i.head.appendChild(r);
												break;
											case "meta":
												if (a = Gm("meta", "content", i).get(t + (n.content || ""))) {
													for (o = 0; o < a.length; o++) if (r = a[o], r.getAttribute("content") === (n.content == null ? null : "" + n.content) && r.getAttribute("name") === (n.name == null ? null : n.name) && r.getAttribute("property") === (n.property == null ? null : n.property) && r.getAttribute("http-equiv") === (n.httpEquiv == null ? null : n.httpEquiv) && r.getAttribute("charset") === (n.charSet == null ? null : n.charSet)) {
														a.splice(o, 1);
														break b;
													}
												}
												r = i.createElement(t), np(r, t, n), i.head.appendChild(r);
												break;
											default: throw Error(s(468, t));
										}
										r[wt] = e, Rt(r), t = r;
									}
									e.stateNode = t;
								}
							} else au || Km(a, e.type, e.stateNode);
						} else e.stateNode = Bm(a, n, e.memoizedProps);
					} else i === n ? n === null && e.stateNode !== null && Pl(e, e.memoizedProps, r.memoizedProps) : (i === null ? (t = r.stateNode, t === null || W || t.parentNode.removeChild(t)) : i.count--, n === null ? au || Km(a, e.type, e.stateNode) : Bm(a, n, e.memoizedProps));
				}
				break;
			case 27:
				Ou(t, e, n), ju(e), i & 512 && (W || r === null || Dl(r, r.return)), r !== null && i & 4 && Pl(e, e.memoizedProps, r.memoizedProps);
				break;
			case 5:
				if (a = ou, ou = !1, Ou(t, e, n), ou = a, ju(e), i & 512 && (W || r === null || Dl(r, r.return)), e.flags & 32) {
					t = e.stateNode;
					try {
						fn(t, ""), L = !0;
					} catch (t) {
						Z(e, e.return, t);
					}
				}
				i & 4 && e.stateNode != null && (t = e.memoizedProps, Pl(e, t, r === null ? t : r.memoizedProps)), i & 1024 && (su = !0);
				break;
			case 6:
				if (Ou(t, e, n), ju(e), i & 4) {
					if (e.stateNode === null) throw Error(s(162));
					t = e.memoizedProps, n = e.stateNode;
					try {
						n.nodeValue = t, L = !0;
					} catch (t) {
						Z(e, e.return, t);
					}
				}
				break;
			case 3:
				if (L = !1, Wm = null, a = ku, ku = bm(t.containerInfo), Ou(t, e, n), ku = a, ju(e), i & 4 && r !== null && r.memoizedState.isDehydrated) try {
					Hh(t.containerInfo);
				} catch (t) {
					Z(e, e.return, t);
				}
				su && (su = !1, Mu(e)), L = !1;
				break;
			case 4:
				i = ou, ou = au, r = Jt(), a = ku, ku = bm(e.stateNode.containerInfo), Ou(t, e, n), ju(e), ku = a, L && du && (fu = !0), L = r, ou = i;
				break;
			case 12:
				Ou(t, e, n), ju(e);
				break;
			case 31:
				Ou(t, e, n), ju(e), i & 4 && (t = e.updateQueue, t !== null && (e.updateQueue = null, Du(e, t)));
				break;
			case 13:
				Ou(t, e, n), ju(e), e.child.flags & 8192 && e.memoizedState !== null != (r !== null && r.memoizedState !== null) && (md = He()), i & 4 && (t = e.updateQueue, t !== null && (e.updateQueue = null, Du(e, t)));
				break;
			case 22:
				a = e.memoizedState !== null, o = r !== null && r.memoizedState !== null;
				var c = au, l = W, u = ou;
				au = c || a, ou = u || a, W = l || o, Ou(t, e, n), W = l, ou = u, au = c, ju(e), i & 8192 && (t = e.stateNode, t._visibility = a ? t._visibility & -2 : t._visibility | 1, !a || r === null || o || au || W || (t = o || W, n = au, r = W, au = a || au, W = t, Iu(e, 2), au = n, W = r), !a && ou || _u(e, a)), i & 4 && (t = e.updateQueue, t !== null && (n = t.retryQueue, n !== null && (t.retryQueue = null, Du(e, n))));
				break;
			case 19:
				Ou(t, e, n), ju(e), i & 4 && (t = e.updateQueue, t !== null && (e.updateQueue = null, Du(e, t)));
				break;
			case 30:
				i & 512 && (W || r === null || Dl(r, r.return)), i = Jt(), a = du, o = (n & 335544064) === n, c = e.memoizedProps, du = o && bi(c.default, c.update) !== "none", Ou(t, e, n), ju(e), o && r !== null && L && (e.flags |= 4), du = a, L = i;
				break;
			case 21: break;
			case 7: i & 512 && (W || r === null || Dl(r, r.return)), r && r.stateNode !== null && (r.stateNode._fragmentFiber = e);
			default: Ou(t, e, n), ju(e);
		}
	}
	function ju(e) {
		var t = e.flags;
		if (t & 2) {
			try {
				for (var n, r = e.return; r !== null;) {
					if (Fl(r)) {
						n = r;
						break;
					}
					r = r.return;
				}
				r = null;
				for (var i = e.return; i !== null;) {
					if (Ml(i)) {
						var a = i.stateNode;
						r === null ? r = [a] : r.push(a);
					}
					if (jl(i)) break;
					i = i.return;
				}
				var o = r;
				if (n == null) throw Error(s(160));
				switch (n.tag) {
					case 27:
						var c = n.stateNode;
						Rl(e, Il(e), c, o);
						break;
					case 5:
						var l = n.stateNode;
						n.flags & 32 && (fn(l, ""), n.flags &= -33), Rl(e, Il(e), l, o);
						break;
					case 3:
					case 4:
						var u = n.stateNode.containerInfo;
						Ll(e, Il(e), u, o);
						break;
					default: throw Error(s(161));
				}
			} catch (t) {
				Z(e, e.return, t);
			}
			e.flags &= -3;
		}
		t & 4096 && (e.flags &= -4097);
	}
	function Mu(e) {
		if (e.subtreeFlags & 1024) for (e = e.child; e !== null;) {
			var t = e;
			Mu(t), t.tag === 5 && t.flags & 1024 && (t = t.stateNode, gh = !0, t.reset(), gh = !1), e = e.sibling;
		}
	}
	function Nu(e, t) {
		if (t.subtreeFlags & 9270) for (t = t.child; t !== null;) Pu(t, e), t = t.sibling;
		else iu(t, !1);
	}
	function Pu(e, t) {
		var n = e.alternate;
		if (n === null) Xl(e, !1);
		else switch (e.tag) {
			case 3:
				if (pu = uu = !1, Wl(), Nu(t, e), !uu && !fu) {
					if (e = Ul, e !== null) for (var r = 0; r < e.length; r += 3) {
						n = e[r];
						var i = e[r + 1];
						Ep(n, e[r + 2]), n = n.ownerDocument.documentElement, n !== null && n.animate({
							opacity: [0, 0],
							pointerEvents: ["none", "none"]
						}, {
							duration: 0,
							fill: "forwards",
							pseudoElement: "::view-transition-group(" + i + ")"
						});
					}
					e = t.containerInfo, e = e.nodeType === 9 ? e.documentElement : e.ownerDocument.documentElement, e !== null && e.style.viewTransitionName === "" && (e.style.viewTransitionName = "none", e.animate({
						opacity: [0, 0],
						pointerEvents: ["none", "none"]
					}, {
						duration: 0,
						fill: "forwards",
						pseudoElement: "::view-transition-group(root)"
					}), e.animate({
						width: [0, 0],
						height: [0, 0]
					}, {
						duration: 0,
						fill: "forwards",
						pseudoElement: "::view-transition"
					})), pu = !0;
				}
				Ul = null;
				break;
			case 5:
				Nu(t, e);
				break;
			case 4:
				r = uu, uu = !1, Nu(t, e), uu && (fu = !0), uu = r;
				break;
			case 22:
				e.memoizedState === null && (n.memoizedState === null ? Nu(t, e) : Xl(e, !1));
				break;
			case 30:
				r = uu, i = Wl(), uu = !1, Nu(t, e), uu && (e.flags |= 4);
				var a = e.memoizedProps, o = e.stateNode;
				t = vi(a, o), o = vi(n.memoizedProps, o);
				var s = bi(a.default, a.update);
				s === "none" ? t = !1 : (a = n.memoizedState, n.memoizedState = null, n = e.child, Gl = 0, t = ru(e, n, t, o, s, a, !0), Gl !== (a === null ? 0 : a.length) && (e.flags |= 32)), e.flags & 4 && t ? (Nd(e, e.memoizedProps.onUpdate), Ul = i) : i !== null && (i.push.apply(i, Ul), Ul = i), uu = e.flags & 32 ? !0 : r;
				break;
			default: Nu(t, e);
		}
	}
	function Fu(e, t) {
		if (t.subtreeFlags & 8772) for (t = t.child; t !== null;) gu(e, t.alternate, t), t = t.sibling;
	}
	function Iu(e, t) {
		for (e = e.child; e !== null;) {
			var n = e, r = t;
			switch (n.tag) {
				case 0:
				case 11:
				case 14:
				case 15:
					Cl(4, n, n.return), Iu(n, r);
					break;
				case 1:
					Dl(n, n.return);
					var i = n.stateNode;
					typeof i.componentWillUnmount == "function" && Tl(n, n.return, i), Iu(n, r);
					break;
				case 27: r & 2 && gm(n.stateNode, n.type, n.memoizedProps);
				case 5:
					Dl(n, n.return), n.tag !== 5 && n.tag !== 27 || Al(n), Iu(n, r);
					break;
				case 6:
					Al(n);
					break;
				case 26:
					Dl(n, n.return), i = n.stateNode, n.memoizedState !== null || i === null || W || i.parentNode.removeChild(i), Iu(n, r);
					break;
				case 22:
					n.memoizedState === null && Iu(n, r);
					break;
				case 30:
					Dl(n, n.return), Iu(n, r);
					break;
				case 7: Dl(n, n.return);
				default: Iu(n, r);
			}
			e = e.sibling;
		}
	}
	function Lu(e, t, n) {
		for (n = t.subtreeFlags & 8772 ? n : n & -2, t = t.child; t !== null;) {
			var r = t.alternate, i = e, a = t, o = a.flags, s = !!(n & 1);
			switch (a.tag) {
				case 0:
				case 11:
				case 15:
					Lu(i, a, n), Sl(4, a);
					break;
				case 1:
					if (Lu(i, a, n), r = a, i = r.stateNode, typeof i.componentDidMount == "function") try {
						i.componentDidMount();
					} catch (e) {
						Z(r, r.return, e);
					}
					if (r = a, i = r.updateQueue, i !== null) {
						var c = r.stateNode;
						try {
							var l = i.shared.hiddenCallbacks;
							if (l !== null) for (i.shared.hiddenCallbacks = null, i = 0; i < l.length; i++) wo(l[i], c);
						} catch (e) {
							Z(r, r.return, e);
						}
					}
					s && o & 64 && wl(a), El(a, a.return);
					break;
				case 27: n & 2 && zl(a);
				case 5:
					a.tag !== 5 && a.tag !== 27 || kl(a), Lu(i, a, n), s && r === null && o & 4 && Nl(a), El(a, a.return);
					break;
				case 6:
					kl(a);
					break;
				case 26:
					c = a.stateNode, a.memoizedState !== null || c === null || au || Km(bm(c.ownerDocument), a.type, c), Lu(i, a, n), s && r === null && o & 4 && Nl(a), El(a, a.return);
					break;
				case 12:
					Lu(i, a, n);
					break;
				case 31:
					Lu(i, a, n), s && o & 4 && wu(i, a);
					break;
				case 13:
					Lu(i, a, n), s && o & 4 && Tu(i, a);
					break;
				case 22:
					a.memoizedState === null && Lu(i, a, n), El(a, a.return);
					break;
				case 30:
					Lu(i, a, n), El(a, a.return);
					break;
				case 7: El(a, a.return);
				default: Lu(i, a, n);
			}
			t = t.sibling;
		}
	}
	function Ru(e, t) {
		var n = null;
		e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), e = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (e = t.memoizedState.cachePool.pool), e !== n && (e != null && e.refCount++, n != null && Na(n));
	}
	function zu(e, t) {
		e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && Na(e));
	}
	function Bu(e, t, n, r) {
		var i = (n & 335544064) === n;
		if (t.subtreeFlags & (i ? 10262 : 10256)) for (t = t.child; t !== null;) Vu(e, t, n, r), t = t.sibling;
		else i && nu(t);
	}
	function Vu(e, t, n, r) {
		var i = (n & 335544064) === n;
		i && t.alternate === null && t.return !== null && t.return.alternate !== null && tu(t);
		var a = t.flags;
		switch (t.tag) {
			case 0:
			case 11:
			case 15:
				Bu(e, t, n, r), a & 2048 && Sl(9, t);
				break;
			case 1:
				Bu(e, t, n, r);
				break;
			case 3:
				Bu(e, t, n, r), i && pu && (e = e.containerInfo, e = e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e, e.style.viewTransitionName === "root" && (e.style.viewTransitionName = ""), e = e.ownerDocument.documentElement, e !== null && e.style.viewTransitionName === "none" && (e.style.viewTransitionName = "")), a & 2048 && (a = null, t.alternate !== null && (a = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== a && (t.refCount++, a != null && Na(a)));
				break;
			case 12:
				if (a & 2048) {
					Bu(e, t, n, r), a = t.stateNode;
					try {
						var o = t.memoizedProps, s = o.id, c = o.onPostCommit;
						typeof c == "function" && c(s, t.alternate === null ? "mount" : "update", a.passiveEffectDuration, -0);
					} catch (e) {
						Z(t, t.return, e);
					}
				} else Bu(e, t, n, r);
				break;
			case 31:
				Bu(e, t, n, r);
				break;
			case 13:
				Bu(e, t, n, r);
				break;
			case 23: break;
			case 22:
				o = t.stateNode, s = t.alternate, t.memoizedState === null ? (i && s !== null && s.memoizedState !== null && tu(t), o._visibility & 2 ? Bu(e, t, n, r) : (o._visibility |= 2, Hu(e, t, n, r, !!(t.subtreeFlags & 10256) || !1))) : (i && s !== null && s.memoizedState === null && tu(s), o._visibility & 2 ? Bu(e, t, n, r) : Uu(e, t)), a & 2048 && Ru(s, t);
				break;
			case 24:
				Bu(e, t, n, r), a & 2048 && zu(t.alternate, t);
				break;
			case 30:
				i && (a = t.alternate, a !== null && (Jl(a.child, !0), Jl(t.child, !0))), Bu(e, t, n, r);
				break;
			default: Bu(e, t, n, r);
		}
	}
	function Hu(e, t, n, r, i) {
		for (i = i && (!!(t.subtreeFlags & 10256) || !1), t = t.child; t !== null;) {
			var a = e, o = t, s = n, c = r, l = o.flags;
			switch (o.tag) {
				case 0:
				case 11:
				case 15:
					Hu(a, o, s, c, i), Sl(8, o);
					break;
				case 23: break;
				case 22:
					var u = o.stateNode;
					o.memoizedState === null ? (u._visibility |= 2, Hu(a, o, s, c, i)) : u._visibility & 2 ? Hu(a, o, s, c, i) : Uu(a, o), i && l & 2048 && Ru(o.alternate, o);
					break;
				case 24:
					Hu(a, o, s, c, i), i && l & 2048 && zu(o.alternate, o);
					break;
				default: Hu(a, o, s, c, i);
			}
			t = t.sibling;
		}
	}
	function Uu(e, t) {
		if (t.subtreeFlags & 10256) for (t = t.child; t !== null;) {
			var n = e, r = t, i = r.flags;
			switch (r.tag) {
				case 22:
					Uu(n, r), i & 2048 && Ru(r.alternate, r);
					break;
				case 24:
					Uu(n, r), i & 2048 && zu(r.alternate, r);
					break;
				default: Uu(n, r);
			}
			t = t.sibling;
		}
	}
	var Wu = 8192;
	function Gu(e, t, n) {
		if (e.subtreeFlags & Wu) for (e = e.child; e !== null;) Ku(e, t, n), e = e.sibling;
	}
	function Ku(e, t, n) {
		switch (e.tag) {
			case 26:
				Gu(e, t, n), e.flags & Wu && (e.memoizedState === null ? (e = e.stateNode, (t & 335544128) === t && Zm(n, e)) : Qm(n, ku, e.memoizedState, e.memoizedProps));
				break;
			case 5:
				Gu(e, t, n), e.flags & Wu && (e = e.stateNode, (t & 335544128) === t && Zm(n, e));
				break;
			case 3:
			case 4:
				var r = ku;
				ku = bm(e.stateNode.containerInfo), Gu(e, t, n), ku = r;
				break;
			case 22:
				e.memoizedState === null && (r = e.alternate, r !== null && r.memoizedState !== null ? (r = Wu, Wu = 16777216, Gu(e, t, n), Wu = r) : Gu(e, t, n));
				break;
			case 30:
				if ((e.flags & Wu) !== 0 && (r = e.memoizedProps.name, r != null && r !== "auto")) {
					var i = e.stateNode;
					i.paired = null, Vl === null && (Vl = /* @__PURE__ */ new Map()), Vl.set(r, i);
				}
				Gu(e, t, n);
				break;
			default: Gu(e, t, n);
		}
	}
	function qu(e) {
		var t = e.alternate;
		if (t !== null && (e = t.child, e !== null)) {
			t.child = null;
			do
				t = e.sibling, e.sibling = null, e = t;
			while (e !== null);
		}
	}
	function Ju(e) {
		var t = e.deletions;
		if (e.flags & 16) {
			if (t !== null) for (var n = 0; n < t.length; n++) {
				var r = t[n];
				lu = r, Zu(r, e);
			}
			qu(e);
		}
		if (e.subtreeFlags & 10256) for (e = e.child; e !== null;) Yu(e), e = e.sibling;
	}
	function Yu(e) {
		switch (e.tag) {
			case 0:
			case 11:
			case 15:
				Ju(e), e.flags & 2048 && Cl(9, e, e.return);
				break;
			case 3:
				Ju(e);
				break;
			case 12:
				Ju(e);
				break;
			case 22:
				var t = e.stateNode;
				e.memoizedState !== null && t._visibility & 2 && (e.return === null || e.return.tag !== 13) ? (t._visibility &= -3, Xu(e)) : Ju(e);
				break;
			default: Ju(e);
		}
	}
	function Xu(e) {
		var t = e.deletions;
		if (e.flags & 16) {
			if (t !== null) for (var n = 0; n < t.length; n++) {
				var r = t[n];
				lu = r, Zu(r, e);
			}
			qu(e);
		}
		for (e = e.child; e !== null;) {
			switch (t = e, t.tag) {
				case 0:
				case 11:
				case 15:
					Cl(8, t, t.return), Xu(t);
					break;
				case 22:
					n = t.stateNode, n._visibility & 2 && (n._visibility &= -3, Xu(t));
					break;
				default: Xu(t);
			}
			e = e.sibling;
		}
	}
	function Zu(e, t) {
		for (; lu !== null;) {
			var n = lu;
			switch (n.tag) {
				case 0:
				case 11:
				case 15:
					Cl(8, n, t);
					break;
				case 23:
				case 22:
					if (n.memoizedState !== null && n.memoizedState.cachePool !== null) {
						var r = n.memoizedState.cachePool.pool;
						r != null && r.refCount++;
					}
					break;
				case 24: Na(n.memoizedState.cache);
			}
			if (r = n.child, r !== null) r.return = n, lu = r;
			else a: for (n = e; lu !== null;) {
				r = lu;
				var i = r.sibling, a = r.return;
				if (bu(r), r === n) {
					lu = null;
					break a;
				}
				if (i !== null) {
					i.return = a, lu = i;
					break a;
				}
				lu = a;
			}
		}
	}
	var Qu = {
		getCacheForType: function(e) {
			var t = Ta(ja), n = t.data.get(e);
			return n === void 0 && (n = e(), t.data.set(e, n)), n;
		},
		cacheSignal: function() {
			return Ta(ja).controller.signal;
		}
	}, $u = typeof WeakMap == "function" ? WeakMap : Map, K = 0, q = null, J = null, Y = 0, X = 0, ed = null, td = !1, nd = !1, rd = !1, id = 0, ad = 0, od = 0, sd = 0, cd = 0, ld = 0, ud = 0, dd = null, fd = null, pd = !1, md = 0, hd = 0, gd = Infinity, _d = null, vd = null, yd = 0, bd = null, xd = null, Sd = 0, Cd = 0, wd = null, Td = null, Ed = null, Dd = null, Od = null, kd = 0, Ad = null;
	function jd() {
		return K & 2 && Y !== 0 ? Y & -Y : N.T === null ? xt() : Pf();
	}
	function Md() {
		if (ld === 0) {
			if (!(Y & 536870912) || B) {
				var e = at;
				at <<= 1, !(at & 3932160) && (at = 262144), ld = e;
			} else ld = 536870912;
		}
		return e = jo.current, e !== null && (e.flags |= 32), ld;
	}
	function Nd(e, t) {
		if (t != null) {
			var n = e.stateNode, r = n.ref;
			r === null && (r = n.ref = Pp(vi(e.memoizedProps, n))), Dd === null && (Dd = []), Dd.push(t.bind(null, r));
		}
	}
	function Pd(e, t, n) {
		(e === q && (X === 2 || X === 9) || e.cancelPendingCommit !== null) && (Vd(e, 0), Rd(e, Y, ld, !1)), mt(e, n), K & 2 && e === q || (e === q && (!(K & 2) && (sd |= n), ad === 4 && Rd(e, Y, ld, !1)), Ef(e));
	}
	function Fd(e, t, n) {
		if (K & 6) throw Error(s(327));
		var r = !n && !(t & 127) && (t & e.expiredLanes) === 0 || lt(e, t), i = r ? Yd(e, t) : qd(e, t, !0), a = r;
		do {
			if (i === 0) {
				nd && !r && Rd(e, t, 0, !1);
				break;
			}
			if (n = e.current.alternate, a && !Ld(n)) i = qd(e, t, !1), a = !1;
			else {
				if (i === 2) {
					if (a = t, e.errorRecoveryDisabledLanes & a) var o = 0;
					else o = e.pendingLanes & -536870913, o = o === 0 ? o & 536870912 ? 536870912 : 0 : o;
					if (o !== 0) {
						t = o;
						a: {
							var c = e;
							i = dd;
							var l = c.current.memoizedState.isDehydrated;
							if (l && (Vd(c, o).flags |= 256), o = qd(c, o, !1), o !== 2 && o !== 6) {
								if (rd && !l) {
									c.errorRecoveryDisabledLanes |= a, sd |= a, i = 4;
									break a;
								}
								a = fd, fd = i, a !== null && (fd === null ? fd = a : fd.push.apply(fd, a));
							}
							i = o;
						}
						if (a = !1, i !== 2) continue;
					}
				}
				if (i === 1) {
					Vd(e, 0), Rd(e, t, 0, !0);
					break;
				}
				a: {
					switch (r = e, a = i, a) {
						case 0:
						case 1: throw Error(s(345));
						case 4: if ((t & 4194048) !== t && (t & 62914560) !== t) break;
						case 6:
							Rd(r, t, ld, !td);
							break a;
						case 2:
							fd = null;
							break;
						case 3:
						case 5: break;
						default: throw Error(s(329));
					}
					if ((t & 62914560) === t && (i = md + 300 - He(), 10 < i)) {
						if (Rd(r, t, ld, !td), ct(r, 0, !0) !== 0) break a;
						Sd = t, r.timeoutHandle = gp(Id.bind(null, r, n, fd, _d, pd, t, ld, sd, ud, td, a, "Throttled", -0, 0), i);
						break a;
					}
					Id(r, n, fd, _d, pd, t, ld, sd, ud, td, a, null, -0, 0);
				}
				break;
			}
		} while (1);
		Ef(e);
	}
	function Id(e, t, n, r, i, a, o, s, c, l, u, d, f, p) {
		e.timeoutHandle = -1;
		var m = t.subtreeFlags, h = (a & 335544064) === a;
		d = null, (h || m & 8192 || (m & 16785408) == 16785408) && (d = {
			stylesheets: null,
			count: 0,
			imgCount: 0,
			imgBytes: 0,
			suspenseyImages: [],
			waitingForImages: !0,
			waitingForViewTransition: !1,
			unsuspend: bn
		}, Vl = null, Ku(t, a, d), h && (m = d, h = e.containerInfo, h = (h.nodeType === 9 ? h : h.ownerDocument).__reactViewTransition, h != null && (m.count++, m.waitingForViewTransition = !0, m = nh.bind(m), h.finished.then(m, m))), m = (a & 62914560) === a ? md - He() : (a & 4194048) === a ? hd - He() : 0, m = eh(d, m), m !== null) ? (Sd = a, e.cancelPendingCommit = m(nf.bind(null, e, t, a, n, r, i, o, s, c, l, u, d, null, f, p)), Rd(e, a, o, !l)) : nf(e, t, a, n, r, i, o, s, c, l, u, d);
	}
	function Ld(e) {
		for (var t = e;;) {
			var n = t.tag;
			if ((n === 0 || n === 11 || n === 15) && t.flags & 16384 && (n = t.updateQueue, n !== null && (n = n.stores, n !== null))) for (var r = 0; r < n.length; r++) {
				var i = n[r], a = i.getSnapshot;
				i = i.value;
				try {
					if (!Hr(a(), i)) return !1;
				} catch {
					return !1;
				}
			}
			if (n = t.child, t.subtreeFlags & 16384 && n !== null) n.return = t, t = n;
			else {
				if (t === e) break;
				for (; t.sibling === null;) {
					if (t.return === null || t.return === e) return !0;
					t = t.return;
				}
				t.sibling.return = t.return, t = t.sibling;
			}
		}
		return !0;
	}
	function Rd(e, t, n, r) {
		t = ut(e, t), t &= ~cd, t &= ~sd, e.suspendedLanes |= t, e.pingedLanes &= ~t, r && (e.warmLanes |= t), r = e.expirationTimes;
		for (var i = t; 0 < i;) {
			var a = 31 - et(i), o = 1 << a;
			r[a] = -1, i &= ~o;
		}
		n !== 0 && gt(e, n, t);
	}
	function zd() {
		return K & 6 ? !0 : (Df(0, !1), !1);
	}
	function Bd() {
		if (J !== null) {
			if (X === 0) var e = J.return;
			else e = J, _a = ga = null, as(e), ao = null, oo = 0, e = J;
			for (; e !== null;) xl(e.alternate, e), e = e.return;
			J = null;
		}
	}
	function Vd(e, t) {
		var n = e.timeoutHandle;
		return n !== -1 && (e.timeoutHandle = -1, _p(n)), n = e.cancelPendingCommit, n !== null && (e.cancelPendingCommit = null, n()), Sd = 0, Bd(), q = e, J = n = Fi(e.current, null), Y = t, X = 0, ed = null, td = !1, nd = lt(e, t), rd = !1, ud = ld = cd = sd = od = ad = 0, fd = dd = null, pd = !1, id = ut(e, t), Ti(), n;
	}
	function Hd(e, t) {
		V = null, N.H = hc, t === Ya || t === Za ? (t = ro(), X = 3) : t === Xa ? (t = ro(), X = 4) : X = t === Nc ? 8 : typeof t == "object" && t && typeof t.then == "function" ? 6 : 1, ed = t, J === null && (ad = 1, Dc(e, Ui(t, e.current)));
	}
	function Ud() {
		var e = jo.current;
		return e === null ? !0 : (Y & 4194048) === Y ? Mo === null : (Y & 62914560) === Y || Y & 536870912 ? e === Mo : !1;
	}
	function Wd() {
		var e = N.H;
		return N.H = hc, e === null ? hc : e;
	}
	function Gd() {
		var e = N.A;
		return N.A = Qu, e;
	}
	function Kd() {
		ad = 4, td || (Y & 4194048) !== Y && jo.current !== null || (nd = !0), !(od & 134217727) && !(sd & 134217727) || q === null || Rd(q, Y, ld, !1);
	}
	function qd(e, t, n) {
		var r = K;
		K |= 2;
		var i = Wd(), a = Gd();
		(q !== e || Y !== t) && (_d = null, Vd(e, t)), t = !1;
		var o = ad;
		a: do
			try {
				if (X !== 0 && J !== null) {
					var s = J, c = ed;
					switch (X) {
						case 8:
							Bd(), o = 6;
							break a;
						case 3:
						case 2:
						case 9:
						case 6:
							jo.current === null && (t = !0);
							var l = X;
							if (X = 0, ed = null, $d(e, s, c, l), n && nd) {
								o = 0;
								break a;
							}
							break;
						default: l = X, X = 0, ed = null, $d(e, s, c, l);
					}
				}
				Jd(), o = ad;
				break;
			} catch (t) {
				Hd(e, t);
			}
		while (1);
		return t && e.shellSuspendCounter++, _a = ga = null, K = r, N.H = i, N.A = a, J === null && (q = null, Y = 0, Ti()), o;
	}
	function Jd() {
		for (; J !== null;) Zd(J);
	}
	function Yd(e, t) {
		var n = K;
		K |= 2;
		var r = Wd(), i = Gd();
		q !== e || Y !== t ? (_d = null, gd = He() + 500, Vd(e, t)) : nd = lt(e, t);
		a: do
			try {
				if (X !== 0 && J !== null) {
					t = J;
					var a = ed;
					b: switch (X) {
						case 1:
							X = 0, ed = null, $d(e, t, a, 1);
							break;
						case 2:
						case 9:
							if ($a(a)) {
								X = 0, ed = null, Qd(t);
								break;
							}
							t = function() {
								X !== 2 && X !== 9 || q !== e || (X = 7), Ef(e);
							}, a.then(t, t);
							break a;
						case 3:
							X = 7;
							break a;
						case 4:
							X = 5;
							break a;
						case 7:
							$a(a) ? (X = 0, ed = null, Qd(t)) : (X = 0, ed = null, $d(e, t, a, 7));
							break;
						case 5:
							var o = null;
							switch (J.tag) {
								case 26: o = J.memoizedState;
								case 5:
								case 27:
									var c = J;
									if (o ? Ym(o) : c.stateNode.complete) {
										X = 0, ed = null;
										var l = c.sibling;
										if (l !== null) J = l;
										else {
											var u = c.return;
											u === null ? J = null : (J = u, ef(u));
										}
										break b;
									}
							}
							X = 0, ed = null, $d(e, t, a, 5);
							break;
						case 6:
							X = 0, ed = null, $d(e, t, a, 6);
							break;
						case 8:
							Bd(), ad = 6;
							break a;
						default: throw Error(s(462));
					}
				}
				Xd();
				break;
			} catch (t) {
				Hd(e, t);
			}
		while (1);
		return _a = ga = null, N.H = r, N.A = i, K = n, J === null ? (q = null, Y = 0, Ti(), ad) : 0;
	}
	function Xd() {
		for (; J !== null && !Be();) Zd(J);
	}
	function Zd(e) {
		var t = pl(e.alternate, e, id);
		e.memoizedProps = e.pendingProps, t === null ? ef(e) : J = t;
	}
	function Qd(e) {
		var t = e, n = t.alternate;
		switch (t.tag) {
			case 15:
			case 0:
				t = qc(n, t, t.pendingProps, t.type, void 0, Y);
				break;
			case 11:
				t = qc(n, t, t.pendingProps, t.type.render, t.ref, Y);
				break;
			case 5:
				as(t);
				var r = t;
				r === ia && (B ? (ua(r), r.tag === 5 && r.stateNode != null && (z = r.stateNode)) : (ua(r), B = !0));
			default: xl(n, t), t = J = Ii(t, id), t = pl(n, t, id);
		}
		e.memoizedProps = e.pendingProps, t === null ? ef(e) : J = t;
	}
	function $d(e, t, n, r) {
		_a = ga = null, as(t), ao = null, oo = 0;
		var i = t.return;
		try {
			if (Mc(e, i, t, n, Y)) {
				ad = 1, Dc(e, Ui(n, e.current)), J = null;
				return;
			}
		} catch (t) {
			if (i !== null) throw J = i, t;
			ad = 1, Dc(e, Ui(n, e.current)), J = null;
			return;
		}
		t.flags & 32768 ? (B || r === 1 ? e = !0 : nd || Y & 536870912 ? e = !1 : (td = e = !0, (r === 2 || r === 9 || r === 3 || r === 6) && (r = jo.current, r !== null && r.tag === 13 && (r.flags |= 16384))), tf(t, e)) : ef(t);
	}
	function ef(e) {
		var t = e;
		do {
			if (t.flags & 32768) {
				tf(t, td);
				return;
			}
			e = t.return;
			var n = yl(t.alternate, t, id);
			if (n !== null) {
				J = n;
				return;
			}
			if (t = t.sibling, t !== null) {
				J = t;
				return;
			}
			J = t = e;
		} while (t !== null);
		ad === 0 && (ad = 5);
	}
	function tf(e, t) {
		do {
			var n = bl(e.alternate, e);
			if (n !== null) {
				n.flags &= 32767, J = n;
				return;
			}
			if (n = e.return, n !== null && (n.flags |= 32768, n.subtreeFlags = 0, n.deletions = null), !t && (e = e.sibling, e !== null)) {
				J = e;
				return;
			}
			J = e = n;
		} while (e !== null);
		ad = 6, J = null;
	}
	function nf(e, t, n, r, i, a, o, c, l, u, d, f) {
		e.cancelPendingCommit = null;
		do
			df();
		while (yd !== 0);
		if (K & 6) throw Error(s(327));
		if (t !== null) {
			if (t === e.current) throw Error(s(177));
			e === q && (J = q = null, Y = 0), xd = t, bd = e, Sd = n, wd = i, Td = r, rf(e, t, n, o, c, l, f);
		}
	}
	function rf(e, t, n, r, i, a, o) {
		var s = t.lanes | t.childLanes;
		if (Cd = s, s |= wi, ht(e, n, s, r, i, a), Dd = null, (n & 335544064) === n ? (Od = Ia(e), r = 10262) : (Od = null, r = 10256), (t.subtreeFlags & r) !== 0 || (t.flags & r) !== 0 ? (e.callbackNode = null, e.callbackPriority = 0, yf(Ke, function() {
			return ff(), null;
		})) : (e.callbackNode = null, e.callbackPriority = 0), Bl = !1, r = !!(t.flags & 13878), t.subtreeFlags & 13878 || r) {
			r = N.T, N.T = null, i = P.p, P.p = 2, a = K, K |= 4;
			try {
				mu(e, t, n);
			} finally {
				K = a, P.p = i, N.T = r;
			}
		}
		yd = 1, Bl ? Ed = Mp(o, e.containerInfo, Od, sf, cf, of, lf, ff, af, null, null) : (sf(), cf(), lf());
	}
	function af(e) {
		if (yd !== 0) {
			var t = bd.onRecoverableError;
			t(e, { componentStack: null });
		}
	}
	function of() {
		yd === 3 && (yd = 0, Pu(xd, bd), yd = 4);
	}
	function sf() {
		if (yd === 1) {
			yd = 0;
			var e = bd, t = xd, n = Sd, r = !!(t.flags & 13878);
			if (t.subtreeFlags & 13878 || r) {
				r = N.T, N.T = null;
				var i = P.p;
				P.p = 2;
				var a = K;
				K |= 4;
				try {
					du = fu = !1, Au(t, e, n), n = cp;
					var o = Jr(e.containerInfo), s = n.focusedElem, c = n.selectionRange;
					if (o !== s && s && s.ownerDocument && qr(s.ownerDocument.documentElement, s)) {
						if (c !== null && Yr(s)) {
							var l = c.start, u = c.end;
							if (u === void 0 && (u = l), "selectionStart" in s) s.selectionStart = l, s.selectionEnd = Math.min(u, s.value.length);
							else {
								var d = s.ownerDocument || document, f = d && d.defaultView || window;
								if (f.getSelection) {
									var p = f.getSelection(), m = s.textContent.length, h = Math.min(c.start, m), g = c.end === void 0 ? h : Math.min(c.end, m);
									!p.extend && h > g && (o = g, g = h, h = o);
									var _ = Kr(s, h), v = Kr(s, g);
									if (_ && v && (p.rangeCount !== 1 || p.anchorNode !== _.node || p.anchorOffset !== _.offset || p.focusNode !== v.node || p.focusOffset !== v.offset)) {
										var y = d.createRange();
										y.setStart(_.node, _.offset), p.removeAllRanges(), h > g ? (p.addRange(y), p.extend(v.node, v.offset)) : (y.setEnd(v.node, v.offset), p.addRange(y));
									}
								}
							}
						}
						for (d = [], p = s; p = p.parentNode;) p.nodeType === 1 && d.push({
							element: p,
							left: p.scrollLeft,
							top: p.scrollTop
						});
						for (typeof s.focus == "function" && s.focus(), s = 0; s < d.length; s++) {
							var b = d[s];
							b.element.scrollLeft = b.left, b.element.scrollTop = b.top;
						}
					}
					gh = !!sp, cp = sp = null;
				} finally {
					K = a, P.p = i, N.T = r;
				}
			}
			e.current = t, yd = 2;
		}
	}
	function cf() {
		if (yd === 2) {
			yd = 0;
			var e = bd, t = xd, n = !!(t.flags & 8772);
			if (t.subtreeFlags & 8772 || n) {
				n = N.T, N.T = null;
				var r = P.p;
				P.p = 2;
				var i = K;
				K |= 4;
				try {
					gu(e, t.alternate, t);
				} finally {
					K = i, P.p = r, N.T = n;
				}
			}
			yd = 3;
		}
	}
	function lf() {
		if (yd === 4 || yd === 3) {
			yd = 0;
			var e = Ed;
			Ed = null, Ve();
			var t = bd, n = xd, r = Sd, i = Td, a = (r & 335544064) === r ? 10262 : 10256;
			if ((n.subtreeFlags & a) !== 0 || (n.flags & a) !== 0 ? yd = 5 : (yd = 0, xd = bd = null, uf(t, t.pendingLanes)), a = t.pendingLanes, a === 0 && (vd = null), bt(r), n = n.stateNode, Qe && typeof Qe.onCommitFiberRoot == "function") try {
				Qe.onCommitFiberRoot(Ze, n, void 0, (n.current.flags & 128) == 128);
			} catch {}
			if (i !== null) {
				n = N.T, a = P.p, P.p = 2, N.T = null;
				try {
					for (var o = t.onRecoverableError, s = 0; s < i.length; s++) {
						var c = i[s];
						o(c.value, { componentStack: c.stack });
					}
				} finally {
					N.T = n, P.p = a;
				}
			}
			if (i = Dd, o = Od, Od = null, i !== null && (Dd = null, o === null && (o = []), e !== null)) for (c = 0; c < i.length; c++) n = (0, i[c])(o), n !== void 0 && e.finished.finally(n);
			Sd & 3 && df(), Ef(t), a = t.pendingLanes, r & 261930 && a & 42 ? t === Ad ? kd++ : (kd = 0, Ad = t) : (kd = 0, Ad = null), Df(0, !1);
		}
	}
	function uf(e, t) {
		(e.pooledCacheLanes &= t) === 0 && (t = e.pooledCache, t != null && (e.pooledCache = null, Na(t)));
	}
	function df() {
		return Ed !== null && (Ed.skipTransition(), Ed = null), sf(), cf(), lf(), ff();
	}
	function ff() {
		if (yd !== 5) return !1;
		var e = bd, t = Cd;
		Cd = 0;
		var n = bt(Sd), r = N.T, i = P.p;
		try {
			P.p = 32 > n ? 32 : n, N.T = null, n = wd, wd = null;
			var a = bd, o = Sd;
			if (yd = 0, xd = bd = null, Sd = 0, K & 6) throw Error(s(331));
			var c = K;
			if (K |= 4, Yu(a.current), Vu(a, a.current, o, n), K = c, Df(0, !1), Qe && typeof Qe.onPostCommitFiberRoot == "function") try {
				Qe.onPostCommitFiberRoot(Ze, a);
			} catch {}
			return !0;
		} finally {
			P.p = i, N.T = r, uf(e, t);
		}
	}
	function pf(e, t, n) {
		t = Ui(n, t), t = kc(e.stateNode, t, 2), e = vo(e, t, 2), e !== null && (mt(e, 2), Ef(e));
	}
	function Z(e, t, n) {
		if (e.tag === 3) pf(e, e, n);
		else for (; t !== null;) {
			if (t.tag === 3) {
				pf(t, e, n);
				break;
			}
			if (t.tag === 1) {
				var r = t.stateNode;
				if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (vd === null || !vd.has(r))) {
					e = Ui(n, e), n = Ac(2), r = vo(t, n, 2), r !== null && (jc(n, r, t, e), mt(r, 2), Ef(r));
					break;
				}
			}
			t = t.return;
		}
	}
	function mf(e, t, n) {
		var r = e.pingCache;
		if (r === null) {
			r = e.pingCache = new $u();
			var i = /* @__PURE__ */ new Set();
			r.set(t, i);
		} else i = r.get(t), i === void 0 && (i = /* @__PURE__ */ new Set(), r.set(t, i));
		i.has(n) || (rd = !0, i.add(n), e = hf.bind(null, e, t, n), t.then(e, e));
	}
	function hf(e, t, n) {
		var r = e.pingCache;
		r !== null && r.delete(t), e.pingedLanes |= e.suspendedLanes & n, e.warmLanes &= ~n, q === e && (Y & n) === n && (ad === 4 || ad === 3 && (Y & 62914560) === Y && 300 > He() - md ? K & 2 ? cd |= n : Vd(e, 0) : cd |= n, ud === Y && (ud = 0)), Ef(e);
	}
	function gf(e, t) {
		t === 0 && (t = ft()), e = Oi(e, t), e !== null && (mt(e, t), Ef(e));
	}
	function _f(e) {
		var t = e.memoizedState, n = 0;
		t !== null && (n = t.retryLane), gf(e, n);
	}
	function vf(e, t) {
		var n = 0;
		switch (e.tag) {
			case 31:
			case 13:
				var r = e.stateNode, i = e.memoizedState;
				i !== null && (n = i.retryLane);
				break;
			case 19:
				r = e.stateNode;
				break;
			case 22:
				r = e.stateNode._retryCache;
				break;
			default: throw Error(s(314));
		}
		r !== null && r.delete(t), gf(e, n);
	}
	function yf(e, t) {
		return I(e, t);
	}
	var bf = null, xf = null, Sf = !1, Cf = !1, wf = !1, Tf = 0;
	function Ef(e) {
		e !== xf && e.next === null && (xf === null ? bf = xf = e : xf = xf.next = e), Cf = !0, Sf || (Sf = !0, Nf());
	}
	function Df(e, t) {
		if (!wf && Cf) {
			wf = !0;
			do
				for (var n = !1, r = bf; r !== null;) {
					if (!t) {
						if (e !== 0) {
							var i = r.pendingLanes;
							if (i === 0) var a = 0;
							else {
								var o = r.suspendedLanes, s = r.pingedLanes;
								a = (1 << 31 - et(42 | e) + 1) - 1, a &= i & ~(o & ~s), a = a & 201326741 ? a & 201326741 | 1 : a ? a | 2 : 0;
							}
							a !== 0 && (n = !0, Mf(r, a));
						} else a = Y, a = ct(r, r === q ? a : 0, r.cancelPendingCommit !== null || r.timeoutHandle !== -1), !(a & 3) || lt(r, a) || (n = !0, Mf(r, a));
					}
					r = r.next;
				}
			while (n);
			wf = !1;
		}
	}
	function Of() {
		kf();
	}
	function kf() {
		Cf = Sf = !1;
		var e = 0;
		Tf !== 0 && hp() && (e = Tf);
		for (var t = He(), n = null, r = bf; r !== null;) {
			var i = r.next, a = Af(r, t);
			a === 0 ? (r.next = null, n === null ? bf = i : n.next = i, i === null && (xf = n)) : (n = r, (e !== 0 || a & 3) && (Cf = !0)), r = i;
		}
		yd !== 0 && yd !== 5 || Df(e, !1), Tf !== 0 && (Tf = 0);
	}
	function Af(e, t) {
		for (var n = e.suspendedLanes, r = e.pingedLanes, i = e.expirationTimes, a = e.pendingLanes & -62914561; 0 < a;) {
			var o = 31 - et(a), s = 1 << o, c = i[o];
			c === -1 ? ((s & n) === 0 || (s & r) !== 0) && (i[o] = dt(s, t)) : c <= t && (e.expiredLanes |= s), a &= ~s;
		}
		if (t = q, n = Y, n = ct(e, e === t ? n : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), r = e.callbackNode, n === 0 || e === t && (X === 2 || X === 9) || e.cancelPendingCommit !== null) return r !== null && r !== null && ze(r), e.callbackNode = null, e.callbackPriority = 0;
		if (!(n & 3) || lt(e, n)) {
			if (t = n & -n, t === e.callbackPriority) return t;
			switch (r !== null && ze(r), bt(n)) {
				case 2:
				case 8:
					n = Ge;
					break;
				case 32:
					n = Ke;
					break;
				case 268435456:
					n = Je;
					break;
				default: n = Ke;
			}
			return r = jf.bind(null, e), n = I(n, r), e.callbackPriority = t, e.callbackNode = n, t;
		}
		return r !== null && r !== null && ze(r), e.callbackPriority = 2, e.callbackNode = null, 2;
	}
	function jf(e, t) {
		if (yd !== 0 && yd !== 5) return e.callbackNode = null, e.callbackPriority = 0, null;
		var n = e.callbackNode;
		if (df() && e.callbackNode !== n) return null;
		var r = Y;
		return r = ct(e, e === q ? r : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), r === 0 ? null : (Fd(e, r, t), Af(e, He()), e.callbackNode != null && e.callbackNode === n ? jf.bind(null, e) : null);
	}
	function Mf(e, t) {
		if (df()) return null;
		Fd(e, t, !0);
	}
	function Nf() {
		bp(function() {
			K & 6 ? I(We, Of) : kf();
		});
	}
	function Pf() {
		if (Tf === 0) {
			var e = za;
			e === 0 && (e = it, it <<= 1, !(it & 261888) && (it = 256)), Tf = e;
		}
		return Tf;
	}
	function Ff(e) {
		return e == null || typeof e == "symbol" || typeof e == "boolean" ? null : typeof e == "function" ? e : yn(e);
	}
	function If(e, t, n, r, i) {
		if (t === "submit" && n && n.stateNode === i) {
			var a = Ff((i[Tt] || null).action), o = r.submitter;
			o && (t = (t = o[Tt] || null) ? Ff(t.formAction) : o.getAttribute("formAction"), t !== null && (a = t, o = null));
			var s = new Vn("action", "action", null, r, i);
			e.push({
				event: s,
				listeners: [{
					instance: null,
					listener: function() {
						if (r.defaultPrevented) {
							if (Tf !== 0) {
								var e = new FormData(i, o);
								tc(n, {
									pending: !0,
									data: e,
									method: i.method,
									action: a
								}, null, e);
							}
						} else typeof a == "function" && (s.preventDefault(), e = new FormData(i, o), tc(n, {
							pending: !0,
							data: e,
							method: i.method,
							action: a
						}, a, e));
					},
					currentTarget: i
				}]
			});
		}
	}
	for (var Lf = 0; Lf < hi.length; Lf++) {
		var Rf = hi[Lf];
		gi(Rf.toLowerCase(), "on" + (Rf[0].toUpperCase() + Rf.slice(1)));
	}
	gi(si, "onAnimationEnd"), gi(ci, "onAnimationIteration"), gi(li, "onAnimationStart"), gi("dblclick", "onDoubleClick"), gi("focusin", "onFocus"), gi("focusout", "onBlur"), gi(ui, "onTransitionRun"), gi(di, "onTransitionStart"), gi(fi, "onTransitionCancel"), gi(pi, "onTransitionEnd"), Ut("onMouseEnter", ["mouseout", "mouseover"]), Ut("onMouseLeave", ["mouseout", "mouseover"]), Ut("onPointerEnter", ["pointerout", "pointerover"]), Ut("onPointerLeave", ["pointerout", "pointerover"]), Ht("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), Ht("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), Ht("onBeforeInput", [
		"compositionend",
		"keypress",
		"textInput",
		"paste"
	]), Ht("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), Ht("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), Ht("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
	var zf = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), Bf = new Set("beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(zf));
	function Vf(e, t) {
		t = !!(t & 4);
		for (var n = 0; n < e.length; n++) {
			var r = e[n], i = r.event;
			r = r.listeners;
			a: {
				var a = void 0;
				if (t) for (var o = r.length - 1; 0 <= o; o--) {
					var s = r[o], c = s.instance, l = s.currentTarget;
					if (s = s.listener, c !== a && i.isPropagationStopped()) break a;
					a = s, i.currentTarget = l;
					try {
						a(i);
					} catch (e) {
						xi(e);
					}
					i.currentTarget = null, a = c;
				}
				else for (o = 0; o < r.length; o++) {
					if (s = r[o], c = s.instance, l = s.currentTarget, s = s.listener, c !== a && i.isPropagationStopped()) break a;
					a = s, i.currentTarget = l;
					try {
						a(i);
					} catch (e) {
						xi(e);
					}
					i.currentTarget = null, a = c;
				}
			}
		}
	}
	function Q(e, t) {
		var n = t[Dt];
		n === void 0 && (n = t[Dt] = /* @__PURE__ */ new Set());
		var r = e + "__bubble";
		n.has(r) || (Gf(t, e, 2, !1), n.add(r));
	}
	function Hf(e, t, n) {
		var r = 0;
		t && (r |= 4), Gf(n, e, r, t);
	}
	var Uf = "_reactListening" + Math.random().toString(36).slice(2);
	function Wf(e) {
		if (!e[Uf]) {
			e[Uf] = !0, Bt.forEach(function(t) {
				t !== "selectionchange" && (Bf.has(t) || Hf(t, !1, e), Hf(t, !0, e));
			});
			var t = e.nodeType === 9 ? e : e.ownerDocument;
			t === null || t[Uf] || (t[Uf] = !0, Hf("selectionchange", !1, t));
		}
	}
	function Gf(e, t, n, r) {
		switch (Ch(t)) {
			case 2:
				var i = _h;
				break;
			case 8:
				i = vh;
				break;
			default: i = yh;
		}
		n = i.bind(null, t, n, e), i = void 0, !An || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (i = !0), r ? i === void 0 ? e.addEventListener(t, n, !0) : e.addEventListener(t, n, {
			capture: !0,
			passive: i
		}) : i === void 0 ? e.addEventListener(t, n, !1) : e.addEventListener(t, n, { passive: i });
	}
	function Kf(e, t, n, r, i) {
		var a = r;
		if (!(t & 1) && !(t & 2) && r !== null) a: for (;;) {
			if (r === null) return;
			var o = r.tag;
			if (o === 3 || o === 4) {
				var s = r.stateNode.containerInfo;
				if (s === i) break;
				if (o === 4) for (o = r.return; o !== null;) {
					var c = o.tag;
					if ((c === 3 || c === 4) && o.stateNode.containerInfo === i) return;
					o = o.return;
				}
				for (; s !== null;) {
					if (o = Pt(s), o === null) return;
					if (c = o.tag, c === 5 || c === 6 || c === 26 || c === 27) {
						r = a = o;
						continue a;
					}
					s = s.parentNode;
				}
			}
			r = r.return;
		}
		Dn(function() {
			var r = a, i = Sn(n), o = [];
			a: {
				var s = mi.get(e);
				if (s !== void 0) {
					var c = Vn, u = e;
					switch (e) {
						case "keypress": if (In(n) === 0) break a;
						case "keydown":
						case "keyup":
							c = ar;
							break;
						case "focusin":
							u = "focus", c = Xn;
							break;
						case "focusout":
							u = "blur", c = Xn;
							break;
						case "beforeblur":
						case "afterblur":
							c = Xn;
							break;
						case "click": if (n.button === 2) break a;
						case "auxclick":
						case "dblclick":
						case "mousedown":
						case "mousemove":
						case "mouseup":
						case "mouseout":
						case "mouseover":
						case "contextmenu":
							c = Jn;
							break;
						case "drag":
						case "dragend":
						case "dragenter":
						case "dragexit":
						case "dragleave":
						case "dragover":
						case "dragstart":
						case "drop":
							c = Yn;
							break;
						case "touchcancel":
						case "touchend":
						case "touchmove":
						case "touchstart":
							c = cr;
							break;
						case si:
						case ci:
						case li:
							c = Zn;
							break;
						case pi:
							c = lr;
							break;
						case "scroll":
						case "scrollend":
							c = Un;
							break;
						case "wheel":
							c = ur;
							break;
						case "copy":
						case "cut":
						case "paste":
							c = Qn;
							break;
						case "gotpointercapture":
						case "lostpointercapture":
						case "pointercancel":
						case "pointerdown":
						case "pointermove":
						case "pointerout":
						case "pointerover":
						case "pointerup":
							c = or;
							break;
						case "submit":
							c = sr;
							break;
						case "toggle":
						case "beforetoggle": c = dr;
					}
					var d = !!(t & 4), f = !d && (e === "scroll" || e === "scrollend"), p = d ? s === null ? null : s + "Capture" : s;
					d = [];
					for (var m = r, h; m !== null;) {
						var g = m;
						if (h = g.stateNode, g = g.tag, g !== 5 && g !== 26 && g !== 27 || h === null || p === null || (g = On(m, p), g != null && d.push(qf(m, g, h))), f) break;
						m = m.return;
					}
					0 < d.length && (s = new c(s, u, null, n, i), o.push({
						event: s,
						listeners: d
					}));
				}
			}
			if (!(t & 7)) {
				a: {
					if (c = e === "mouseover" || e === "pointerover", s = e === "mouseout" || e === "pointerout", c && n !== xn && (u = n.relatedTarget || n.fromElement) && (Pt(u) || u[Et])) break a;
					(s || c) && (u = i.window === i ? i : (c = i.ownerDocument) ? c.defaultView || c.parentWindow : window, s ? (c = n.relatedTarget || n.toElement, s = r, c = c ? Pt(c) : null, c !== null && (f = l(c), d = c.tag, c !== f || d !== 5 && d !== 27 && d !== 6) && (c = null)) : (s = null, c = r), s !== c && (d = Jn, g = "onMouseLeave", p = "onMouseEnter", m = "mouse", (e === "pointerout" || e === "pointerover") && (d = or, g = "onPointerLeave", p = "onPointerEnter", m = "pointer"), f = s == null ? u : It(s), h = c == null ? u : It(c), u = new d(g, m + "leave", s, n, i), u.target = f, u.relatedTarget = h, g = null, Pt(i) === r && (d = new d(p, m + "enter", c, n, i), d.target = h, d.relatedTarget = f, g = d), f = g, d = s && c ? E(s, c, Yf) : null, s !== null && Xf(o, u, s, d, !1), c !== null && f !== null && Xf(o, f, c, d, !0)));
				}
				a: {
					if (s = r ? It(r) : window, c = s.nodeName && s.nodeName.toLowerCase(), c === "select" || c === "input" && s.type === "file") var _ = Ar;
					else if (wr(s)) {
						if (jr) _ = Br;
						else {
							_ = Rr;
							var v = Lr;
						}
					} else c = s.nodeName, !c || c.toLowerCase() !== "input" || s.type !== "checkbox" && s.type !== "radio" ? r && gn(r.elementType) && (_ = Ar) : _ = zr;
					if (_ && (_ = _(e, r))) {
						Tr(o, _, n, i);
						break a;
					}
					v && v(e, s, r);
				}
				switch (v = r ? It(r) : window, e) {
					case "focusin":
						(wr(v) || v.contentEditable === "true") && (Zr = v, Qr = r, $r = null);
						break;
					case "focusout":
						$r = Qr = Zr = null;
						break;
					case "mousedown":
						ei = !0;
						break;
					case "contextmenu":
					case "mouseup":
					case "dragend":
						ei = !1, ti(o, n, i);
						break;
					case "selectionchange": if (Xr) break;
					case "keydown":
					case "keyup": ti(o, n, i);
				}
				var y;
				if (pr) b: {
					switch (e) {
						case "compositionstart":
							var b = "onCompositionStart";
							break b;
						case "compositionend":
							b = "onCompositionEnd";
							break b;
						case "compositionupdate":
							b = "onCompositionUpdate";
							break b;
					}
					b = void 0;
				}
				else xr ? yr(e, n) && (b = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (b = "onCompositionStart");
				b && (gr && n.locale !== "ko" && (xr || b !== "onCompositionStart" ? b === "onCompositionEnd" && xr && (y = Fn()) : (Mn = i, Nn = "value" in Mn ? Mn.value : Mn.textContent, xr = !0)), v = Jf(r, b), 0 < v.length && (b = new $n(b, e, null, n, i), o.push({
					event: b,
					listeners: v
				}), y ? b.data = y : (y = br(n), y !== null && (b.data = y)))), (y = hr ? Sr(e, n) : R(e, n)) && (b = Jf(r, "onBeforeInput"), 0 < b.length && (v = new $n("onBeforeInput", "beforeinput", null, n, i), o.push({
					event: v,
					listeners: b
				}), v.data = y)), If(o, e, r, n, i);
			}
			Vf(o, t);
		});
	}
	function qf(e, t, n) {
		return {
			instance: e,
			listener: t,
			currentTarget: n
		};
	}
	function Jf(e, t) {
		for (var n = t + "Capture", r = []; e !== null;) {
			var i = e, a = i.stateNode;
			if (i = i.tag, i !== 5 && i !== 26 && i !== 27 || a === null || (i = On(e, n), i != null && r.unshift(qf(e, i, a)), i = On(e, t), i != null && r.push(qf(e, i, a))), e.tag === 3) return r;
			e = e.return;
		}
		return [];
	}
	function Yf(e) {
		if (e === null) return null;
		do
			e = e.return;
		while (e && e.tag !== 5 && e.tag !== 27);
		return e || null;
	}
	function Xf(e, t, n, r, i) {
		for (var a = t._reactName, o = []; n !== null && n !== r;) {
			var s = n, c = s.alternate, l = s.stateNode;
			if (s = s.tag, c !== null && c === r) break;
			s !== 5 && s !== 26 && s !== 27 || l === null || (c = l, i ? (l = On(n, a), l != null && o.unshift(qf(n, l, c))) : i || (l = On(n, a), l != null && o.push(qf(n, l, c)))), n = n.return;
		}
		o.length !== 0 && e.push({
			event: t,
			listeners: o
		});
	}
	var Zf = /\r\n?/g, Qf = /\u0000|\uFFFD/g;
	function $f(e) {
		return (typeof e == "string" ? e : "" + e).replace(Zf, "\n").replace(Qf, "");
	}
	function ep(e, t) {
		return t = $f(t), $f(e) === t;
	}
	function $(e, t, n, r, i, a) {
		switch (n) {
			case "children":
				if (typeof r == "string") t === "body" || t === "textarea" && r === "" || fn(e, r);
				else if (typeof r == "number" || typeof r == "bigint") t !== "body" && fn(e, "" + r);
				else return;
				break;
			case "className":
				Xt(e, "class", r);
				break;
			case "tabIndex":
				Xt(e, "tabindex", r);
				break;
			case "dir":
			case "role":
			case "viewBox":
			case "width":
			case "height":
				Xt(e, n, r);
				break;
			case "style":
				hn(e, r, a);
				return;
			case "data": if (t !== "object") {
				Xt(e, "data", r);
				break;
			}
			case "src":
			case "href":
				if (r === "" && (t !== "a" || n !== "href") || r == null || typeof r == "function" || typeof r == "symbol" || typeof r == "boolean") {
					e.removeAttribute(n);
					break;
				}
				r = yn(r), e.setAttribute(n, r);
				break;
			case "action":
			case "formAction":
				if (typeof r == "function") {
					e.setAttribute(n, "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')");
					break;
				}
				if (typeof a == "function" && (n === "formAction" ? (t !== "input" && $(e, t, "name", i.name, i, null), $(e, t, "formEncType", i.formEncType, i, null), $(e, t, "formMethod", i.formMethod, i, null), $(e, t, "formTarget", i.formTarget, i, null)) : ($(e, t, "encType", i.encType, i, null), $(e, t, "method", i.method, i, null), $(e, t, "target", i.target, i, null))), r == null || typeof r == "symbol" || typeof r == "boolean") {
					e.removeAttribute(n);
					break;
				}
				r = yn(r), e.setAttribute(n, r);
				break;
			case "onClick":
				r != null && (e.onclick = bn);
				return;
			case "onScroll":
				r != null && Q("scroll", e);
				return;
			case "onScrollEnd":
				r != null && Q("scrollend", e);
				return;
			case "dangerouslySetInnerHTML":
				if (r != null) {
					if (typeof r != "object" || !("__html" in r)) throw Error(s(61));
					if (n = r.__html, n != null) {
						if (i.children != null) throw Error(s(60));
						a?.__html !== n && (e.innerHTML = n);
					}
				}
				break;
			case "multiple":
				e.multiple = r && typeof r != "function" && typeof r != "symbol";
				break;
			case "muted":
				e.muted = r && typeof r != "function" && typeof r != "symbol";
				break;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "defaultValue":
			case "defaultChecked":
			case "innerHTML":
			case "ref": break;
			case "autoFocus": break;
			case "xlinkHref":
				if (r == null || typeof r == "function" || typeof r == "boolean" || typeof r == "symbol") {
					e.removeAttribute("xlink:href");
					break;
				}
				n = yn(r), e.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", n);
				break;
			case "contentEditable":
			case "spellCheck":
			case "draggable":
			case "value":
			case "autoReverse":
			case "externalResourcesRequired":
			case "focusable":
			case "preserveAlpha":
				r != null && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, r) : e.removeAttribute(n);
				break;
			case "inert":
			case "allowFullScreen":
			case "async":
			case "autoPlay":
			case "controls":
			case "credentialless":
			case "default":
			case "defer":
			case "disabled":
			case "disablePictureInPicture":
			case "disableRemotePlayback":
			case "formNoValidate":
			case "hidden":
			case "loop":
			case "noModule":
			case "noValidate":
			case "open":
			case "playsInline":
			case "readOnly":
			case "required":
			case "reversed":
			case "scoped":
			case "seamless":
			case "itemScope":
				r && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, "") : e.removeAttribute(n);
				break;
			case "capture":
			case "download":
				!0 === r ? e.setAttribute(n, "") : !1 !== r && r != null && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, r) : e.removeAttribute(n);
				break;
			case "cols":
			case "rows":
			case "size":
			case "span":
				r != null && typeof r != "function" && typeof r != "symbol" && !isNaN(r) && 1 <= r ? e.setAttribute(n, r) : e.removeAttribute(n);
				break;
			case "rowSpan":
			case "start":
				r == null || typeof r == "function" || typeof r == "symbol" || isNaN(r) ? e.removeAttribute(n) : e.setAttribute(n, r);
				break;
			case "popover":
				Q("beforetoggle", e), Q("toggle", e), Yt(e, "popover", r);
				break;
			case "xlinkActuate":
				Zt(e, "http://www.w3.org/1999/xlink", "xlink:actuate", r);
				break;
			case "xlinkArcrole":
				Zt(e, "http://www.w3.org/1999/xlink", "xlink:arcrole", r);
				break;
			case "xlinkRole":
				Zt(e, "http://www.w3.org/1999/xlink", "xlink:role", r);
				break;
			case "xlinkShow":
				Zt(e, "http://www.w3.org/1999/xlink", "xlink:show", r);
				break;
			case "xlinkTitle":
				Zt(e, "http://www.w3.org/1999/xlink", "xlink:title", r);
				break;
			case "xlinkType":
				Zt(e, "http://www.w3.org/1999/xlink", "xlink:type", r);
				break;
			case "xmlBase":
				Zt(e, "http://www.w3.org/XML/1998/namespace", "xml:base", r);
				break;
			case "xmlLang":
				Zt(e, "http://www.w3.org/XML/1998/namespace", "xml:lang", r);
				break;
			case "xmlSpace":
				Zt(e, "http://www.w3.org/XML/1998/namespace", "xml:space", r);
				break;
			case "is":
				Yt(e, "is", r);
				break;
			case "innerText":
			case "textContent": return;
			default: if (!(2 < n.length) || n[0] !== "o" && n[0] !== "O" || n[1] !== "n" && n[1] !== "N") n = _n.get(n) || n, Yt(e, n, r);
			else return;
		}
		L = !0;
	}
	function tp(e, t, n, r, i, a) {
		switch (n) {
			case "style":
				hn(e, r, a);
				return;
			case "dangerouslySetInnerHTML":
				if (r != null) {
					if (typeof r != "object" || !("__html" in r)) throw Error(s(61));
					if (n = r.__html, n != null) {
						if (i.children != null) throw Error(s(60));
						a?.__html !== n && (e.innerHTML = n);
					}
				}
				break;
			case "children":
				if (typeof r == "string") fn(e, r);
				else if (typeof r == "number" || typeof r == "bigint") fn(e, "" + r);
				else return;
				break;
			case "onScroll":
				r != null && Q("scroll", e);
				return;
			case "onScrollEnd":
				r != null && Q("scrollend", e);
				return;
			case "onClick":
				r != null && (e.onclick = bn);
				return;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "innerHTML":
			case "ref": return;
			case "innerText":
			case "textContent": return;
			default:
				if (!Vt.hasOwnProperty(n)) a: {
					if (n[0] === "o" && n[1] === "n" && (i = n.endsWith("Capture"), a = n.slice(2, i ? n.length - 7 : void 0), t = e[Tt] || null, t = t == null ? null : t[n], typeof t == "function" && e.removeEventListener(a, t, i), typeof r == "function")) {
						typeof t != "function" && t !== null && (n in e ? e[n] = null : e.hasAttribute(n) && e.removeAttribute(n)), e.addEventListener(a, r, i);
						break a;
					}
					L = !0, n in e ? e[n] = r : !0 === r ? e.setAttribute(n, "") : Yt(e, n, r);
				}
				return;
		}
		L = !0;
	}
	function np(e, t, n) {
		switch (t) {
			case "div":
			case "span":
			case "svg":
			case "path":
			case "a":
			case "g":
			case "p":
			case "li": break;
			case "img":
				Q("error", e), Q("load", e);
				var r = !1, i = !1, a;
				for (a in n) if (n.hasOwnProperty(a)) {
					var o = n[a];
					if (o != null) switch (a) {
						case "src":
							r = !0;
							break;
						case "srcSet":
							i = !0;
							break;
						case "children":
						case "dangerouslySetInnerHTML": throw Error(s(137, t));
						default: $(e, t, a, o, n, null);
					}
				}
				i && $(e, t, "srcSet", n.srcSet, n, null), r && $(e, t, "src", n.src, n, null);
				return;
			case "input":
				Q("invalid", e);
				var c = a = o = i = null, l = null, u = null;
				for (r in n) if (n.hasOwnProperty(r)) {
					var d = n[r];
					if (d != null) switch (r) {
						case "name":
							i = d;
							break;
						case "type":
							o = d;
							break;
						case "checked":
							l = d;
							break;
						case "defaultChecked":
							u = d;
							break;
						case "value":
							a = d;
							break;
						case "defaultValue":
							c = d;
							break;
						case "children":
						case "dangerouslySetInnerHTML":
							if (d != null) throw Error(s(137, t));
							break;
						default: $(e, t, r, d, n, null);
					}
				}
				sn(e, a, c, l, u, o, i, !1);
				return;
			case "select":
				for (i in Q("invalid", e), r = o = a = null, n) if (n.hasOwnProperty(i) && (c = n[i], c != null)) switch (i) {
					case "value":
						a = c;
						break;
					case "defaultValue":
						o = c;
						break;
					case "multiple": r = c;
					default: $(e, t, i, c, n, null);
				}
				t = a, n = o, e.multiple = !!r, t == null ? n != null && ln(e, !!r, n, !0) : ln(e, !!r, t, !1);
				return;
			case "textarea":
				for (o in Q("invalid", e), a = i = r = null, n) if (n.hasOwnProperty(o) && (c = n[o], c != null)) switch (o) {
					case "value":
						r = c;
						break;
					case "defaultValue":
						i = c;
						break;
					case "children":
						a = c;
						break;
					case "dangerouslySetInnerHTML":
						if (c != null) throw Error(s(91));
						break;
					default: $(e, t, o, c, n, null);
				}
				dn(e, r, i, a);
				return;
			case "option":
				for (l in n) if (n.hasOwnProperty(l) && (r = n[l], r != null)) switch (l) {
					case "selected":
						e.selected = r && typeof r != "function" && typeof r != "symbol";
						break;
					default: $(e, t, l, r, n, null);
				}
				return;
			case "dialog":
				Q("beforetoggle", e), Q("toggle", e), Q("cancel", e), Q("close", e);
				break;
			case "iframe":
			case "object":
				Q("load", e);
				break;
			case "video":
			case "audio":
				for (r = 0; r < zf.length; r++) Q(zf[r], e);
				break;
			case "image":
				Q("error", e), Q("load", e);
				break;
			case "details":
				Q("toggle", e);
				break;
			case "embed":
			case "source":
			case "link": Q("error", e), Q("load", e);
			case "area":
			case "base":
			case "br":
			case "col":
			case "hr":
			case "keygen":
			case "meta":
			case "param":
			case "track":
			case "wbr":
			case "menuitem":
				for (u in n) if (n.hasOwnProperty(u) && (r = n[u], r != null)) switch (u) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error(s(137, t));
					default: $(e, t, u, r, n, null);
				}
				return;
			default: if (gn(t)) {
				for (d in n) n.hasOwnProperty(d) && (r = n[d], r !== void 0 && tp(e, t, d, r, n, void 0));
				return;
			}
		}
		for (c in n) n.hasOwnProperty(c) && (r = n[c], r != null && $(e, t, c, r, n, null));
	}
	var rp = {};
	function ip(e, t, n, r) {
		switch (t) {
			case "div":
			case "span":
			case "svg":
			case "path":
			case "a":
			case "g":
			case "p":
			case "li": break;
			case "input":
				var i = null, a = null, o = null, c = null, l = null, u = null, d = null;
				for (m in n) {
					var f = n[m];
					if (n.hasOwnProperty(m) && f != null) switch (m) {
						case "checked": break;
						case "value": break;
						case "defaultValue": l = f;
						default: r.hasOwnProperty(m) || $(e, t, m, null, r, f);
					}
				}
				for (var p in r) {
					var m = r[p];
					if (f = n[p], r.hasOwnProperty(p) && (m != null || f != null)) switch (p) {
						case "type":
							m !== f && (L = !0), a = m;
							break;
						case "name":
							m !== f && (L = !0), i = m;
							break;
						case "checked":
							m !== f && (L = !0), u = m;
							break;
						case "defaultChecked":
							m !== f && (L = !0), d = m;
							break;
						case "value":
							m !== f && (L = !0), o = m;
							break;
						case "defaultValue":
							m !== f && (L = !0), c = m;
							break;
						case "children":
						case "dangerouslySetInnerHTML":
							if (m != null) throw Error(s(137, t));
							break;
						default: m !== f && $(e, t, p, m, r, f);
					}
				}
				on(e, o, c, l, u, d, a, i);
				return;
			case "select":
				for (a in m = o = c = p = null, n) if (l = n[a], n.hasOwnProperty(a) && l != null) switch (a) {
					case "value": break;
					case "multiple": m = l;
					default: r.hasOwnProperty(a) || $(e, t, a, null, r, l);
				}
				for (i in r) if (a = r[i], l = n[i], r.hasOwnProperty(i) && (a != null || l != null)) switch (i) {
					case "value":
						a !== l && (L = !0), p = a;
						break;
					case "defaultValue":
						a !== l && (L = !0), c = a;
						break;
					case "multiple": a !== l && (L = !0), o = a;
					default: a !== l && $(e, t, i, a, r, l);
				}
				t = c, n = o, r = m, p == null ? !!r != !!n && (t == null ? ln(e, !!n, n ? [] : "", !1) : ln(e, !!n, t, !0)) : ln(e, !!n, p, !1);
				return;
			case "textarea":
				for (c in m = p = null, n) if (i = n[c], n.hasOwnProperty(c) && i != null && !r.hasOwnProperty(c)) switch (c) {
					case "value": break;
					case "children": break;
					default: $(e, t, c, null, r, i);
				}
				for (o in r) if (i = r[o], a = n[o], r.hasOwnProperty(o) && (i != null || a != null)) switch (o) {
					case "value":
						i !== a && (L = !0), p = i;
						break;
					case "defaultValue":
						i !== a && (L = !0), m = i;
						break;
					case "children": break;
					case "dangerouslySetInnerHTML":
						if (i != null) throw Error(s(91));
						break;
					default: i !== a && $(e, t, o, i, r, a);
				}
				un(e, p, m);
				return;
			case "option":
				for (var h in n) if (p = n[h], n.hasOwnProperty(h) && p != null && !r.hasOwnProperty(h)) switch (h) {
					case "selected":
						e.selected = !1;
						break;
					default: $(e, t, h, null, r, p);
				}
				for (l in r) if (p = r[l], m = n[l], r.hasOwnProperty(l) && p !== m && (p != null || m != null)) switch (l) {
					case "selected":
						p !== m && (L = !0), e.selected = p && typeof p != "function" && typeof p != "symbol";
						break;
					default: $(e, t, l, p, r, m);
				}
				return;
			case "img":
			case "link":
			case "area":
			case "base":
			case "br":
			case "col":
			case "embed":
			case "hr":
			case "keygen":
			case "meta":
			case "param":
			case "source":
			case "track":
			case "wbr":
			case "menuitem":
				for (var g in n) p = n[g], n.hasOwnProperty(g) && p != null && !r.hasOwnProperty(g) && $(e, t, g, null, r, p);
				for (u in r) if (p = r[u], m = n[u], r.hasOwnProperty(u) && p !== m && (p != null || m != null)) switch (u) {
					case "children":
					case "dangerouslySetInnerHTML":
						if (p != null) throw Error(s(137, t));
						break;
					default: $(e, t, u, p, r, m);
				}
				return;
			default: if (gn(t)) {
				for (var _ in n) p = n[_], n.hasOwnProperty(_) && p !== void 0 && !r.hasOwnProperty(_) && tp(e, t, _, void 0, r, p);
				for (d in r) p = r[d], m = n[d], !r.hasOwnProperty(d) || p === m || p === void 0 && m === void 0 || tp(e, t, d, p, r, m);
				return;
			}
		}
		for (var v in n) p = n[v], n.hasOwnProperty(v) && p != null && !r.hasOwnProperty(v) && $(e, t, v, null, r, p);
		for (f in r) p = r[f], m = n[f], !r.hasOwnProperty(f) || p === m || p == null && m == null || $(e, t, f, p, r, m);
	}
	function ap(e) {
		switch (e) {
			case "css":
			case "script":
			case "font":
			case "img":
			case "image":
			case "input":
			case "link": return !0;
			default: return !1;
		}
	}
	function op() {
		if (typeof performance.getEntriesByType == "function") {
			for (var e = 0, t = 0, n = performance.getEntriesByType("resource"), r = 0; r < n.length; r++) {
				var i = n[r], a = i.transferSize, o = i.initiatorType, s = i.duration;
				if (a && s && ap(o)) {
					for (o = 0, s = i.responseEnd, r += 1; r < n.length; r++) {
						var c = n[r], l = c.startTime;
						if (l > s) break;
						var u = c.transferSize, d = c.initiatorType;
						u && ap(d) && (c = c.responseEnd, o += u * (c < s ? 1 : (s - l) / (c - l)));
					}
					if (--r, t += 8 * (a + o) / (i.duration / 1e3), e++, 10 < e) break;
				}
			}
			if (0 < e) return t / e / 1e6;
		}
		return navigator.connection && (e = navigator.connection.downlink, typeof e == "number") ? e : 5;
	}
	var sp = null, cp = null;
	function lp(e) {
		return e.nodeType === 9 ? e : e.ownerDocument;
	}
	function up(e) {
		switch (e) {
			case "http://www.w3.org/2000/svg": return 1;
			case "http://www.w3.org/1998/Math/MathML": return 2;
			default: return 0;
		}
	}
	function dp(e, t) {
		if (e === 0) switch (t) {
			case "svg": return 1;
			case "math": return 2;
			default: return 0;
		}
		return e === 1 && t === "foreignObject" ? 0 : e;
	}
	function fp(e, t, n, r) {
		return n = lp(n).createElement(e), n[wt] = r, n[Tt] = t, np(n, e, t), Rt(n), n;
	}
	function pp(e, t) {
		return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
	}
	var mp = null;
	function hp() {
		var e = window.event;
		return e && e.type === "popstate" ? e !== mp && (mp = e, !0) : (mp = null, !1);
	}
	var gp = typeof setTimeout == "function" ? setTimeout : void 0, _p = typeof clearTimeout == "function" ? clearTimeout : void 0, vp = typeof Promise == "function" ? Promise : void 0, yp = typeof requestAnimationFrame == "function" ? requestAnimationFrame : gp, bp = typeof queueMicrotask == "function" ? queueMicrotask : vp === void 0 ? gp : function(e) {
		return vp.resolve(null).then(e).catch(xp);
	};
	function xp(e) {
		setTimeout(function() {
			throw e;
		});
	}
	function Sp(e) {
		return e === "head";
	}
	function Cp(e, t) {
		var n = t, r = 0;
		do {
			var i = n.nextSibling;
			if (e.removeChild(n), i && i.nodeType === 8) {
				if (n = i.data, n === "/$" || n === "/&") {
					if (r === 0) {
						e.removeChild(i), Hh(t);
						return;
					}
					r--;
				} else if (n === "$" || n === "$?" || n === "$~" || n === "$!" || n === "&") r++;
				else if (n === "html") _m(e.ownerDocument.documentElement);
				else if (n === "head") {
					n = e.ownerDocument.head, _m(n);
					for (var a = n.firstChild; a;) {
						var o = a.nextSibling, s = a.nodeName;
						a[jt] || s === "SCRIPT" || s === "STYLE" || s === "LINK" && a.rel.toLowerCase() === "stylesheet" || n.removeChild(a), a = o;
					}
				} else n === "body" && _m(e.ownerDocument.body);
			}
			n = i;
		} while (n);
		Hh(t);
	}
	function wp(e, t) {
		var n = e;
		e = 0;
		do {
			var r = n.nextSibling;
			if (n.nodeType === 1 ? t ? (n._stashedDisplay = n.style.display, n.style.display = "none") : (n.style.display = n._stashedDisplay || "", n.getAttribute("style") === "" && n.removeAttribute("style")) : n.nodeType === 3 && (t ? (n._stashedText = n.nodeValue, n.nodeValue = "") : n.nodeValue = n._stashedText || ""), r && r.nodeType === 8) {
				if (n = r.data, n === "/$") {
					if (e === 0) break;
					e--;
				} else n !== "$" && n !== "$?" && n !== "$~" && n !== "$!" || e++;
			}
			n = r;
		} while (n);
	}
	function Tp(e, t, n) {
		if (t = CSS.escape(t) === t ? t : "r-" + btoa(t).replace(/=/g, ""), e.style.viewTransitionName = t, n != null && (e.style.viewTransitionClass = n), n = getComputedStyle(e), n.display === "inline") {
			if (t = e.getClientRects(), t.length === 1) var r = 1;
			else for (var i = r = 0; i < t.length; i++) {
				var a = t[i];
				0 < a.width && 0 < a.height && r++;
			}
			r === 1 && (e = e.style, e.display = t.length === 1 ? "inline-block" : "block", e.marginTop = "-" + n.paddingTop, e.marginBottom = "-" + n.paddingBottom);
		}
	}
	function Ep(e, t) {
		e = e.style, t = t.style;
		var n = t == null ? null : t.hasOwnProperty("viewTransitionName") ? t.viewTransitionName : t.hasOwnProperty("view-transition-name") ? t["view-transition-name"] : null;
		e.viewTransitionName = n == null || typeof n == "boolean" ? "" : ("" + n).trim(), n = t == null ? null : t.hasOwnProperty("viewTransitionClass") ? t.viewTransitionClass : t.hasOwnProperty("view-transition-class") ? t["view-transition-class"] : null, e.viewTransitionClass = n == null || typeof n == "boolean" ? "" : ("" + n).trim(), e.display === "inline-block" && (t == null ? e.display = e.margin = "" : (n = t.display, e.display = n == null || typeof n == "boolean" ? "" : n, n = t.margin, n == null ? (n = t.hasOwnProperty("marginTop") ? t.marginTop : t["margin-top"], e.marginTop = n == null || typeof n == "boolean" ? "" : n, t = t.hasOwnProperty("marginBottom") ? t.marginBottom : t["margin-bottom"], e.marginBottom = t == null || typeof t == "boolean" ? "" : t) : e.margin = n));
	}
	function Dp(e, t, n) {
		return n = n.ownerDocument.defaultView, {
			rect: e,
			abs: t.position === "absolute" || t.position === "fixed",
			clip: t.clipPath !== "none" || t.overflow !== "visible" || t.filter !== "none" || t.mask !== "none" || t.mask !== "none" || t.borderRadius !== "0px",
			view: 0 <= e.bottom && 0 <= e.right && e.top <= n.innerHeight && e.left <= n.innerWidth
		};
	}
	function Op(e) {
		return Dp(e.getBoundingClientRect(), getComputedStyle(e), e);
	}
	function kp(e) {
		var t = e.getBoundingClientRect();
		t = new DOMRect(t.x + 2e4, t.y + 2e4, t.width, t.height);
		var n = getComputedStyle(e);
		return Dp(t, n, e);
	}
	function Ap(e) {
		return e.documentElement.clientHeight;
	}
	function jp(e) {
		this.addEventListener("load", e), this.addEventListener("error", e);
	}
	function Mp(e, t, n, r, i, a, o, s, c) {
		var l = t.nodeType === 9 ? t : t.ownerDocument;
		try {
			var u = l.startViewTransition({
				update: function() {
					var t = l.defaultView, n = t.navigation && t.navigation.transition, o = l.fonts.status;
					r();
					var s = [];
					if (o === "loaded" && (Ap(l), l.fonts.status === "loading" && s.push(l.fonts.ready)), o = s.length, e !== null) for (var c = e.suspenseyImages, u = 0, d = 0; d < c.length; d++) {
						var f = c[d];
						if (!f.complete) {
							var p = f.getBoundingClientRect();
							if (0 < p.bottom && 0 < p.right && p.top < t.innerHeight && p.left < t.innerWidth) {
								if (u += Xm(f), u > $m) {
									s.length = o;
									break;
								}
								f = new Promise(jp.bind(f)), s.push(f);
							}
						}
					}
					if (0 < s.length) return t = Promise.race([Promise.all(s), new Promise(function(e) {
						return setTimeout(e, 500);
					})]).then(i, i), (n ? Promise.allSettled([n.finished, t]) : t).then(a, a);
					if (i(), n) return n.finished.then(a, a);
					a();
				},
				types: n
			});
			l.__reactViewTransition = u;
			var d = [];
			return u.ready.then(function() {
				for (var e = l.documentElement.getAnimations({ subtree: !0 }), t = 0; t < e.length; t++) {
					var n = e[t], r = n.effect, i = r.pseudoElement;
					if (i != null && i.startsWith("::view-transition")) {
						d.push(n), n = r.getKeyframes();
						for (var a = i = void 0, s = !0, c = 0; c < n.length; c++) {
							var u = n[c], f = u.width;
							if (i === void 0) i = f;
							else if (i !== f) {
								s = !1;
								break;
							}
							if (f = u.height, a === void 0) a = f;
							else if (a !== f) {
								s = !1;
								break;
							}
							delete u.width, delete u.height, u.transform === "none" && delete u.transform;
						}
						s && i !== void 0 && a !== void 0 && (r.setKeyframes(n), s = getComputedStyle(r.target, r.pseudoElement), s.width !== i || s.height !== a) && (s = n[0], s.width = i, s.height = a, s = n[n.length - 1], s.width = i, s.height = a, r.setKeyframes(n));
					}
				}
				o();
			}, function(e) {
				l.__reactViewTransition === u && (l.__reactViewTransition = null);
				try {
					if (typeof e == "object" && e) switch (e.name) {
						case "InvalidStateError": (e.message === "View transition was skipped because document visibility state is hidden." || e.message === "Skipping view transition because document visibility state has become hidden." || e.message === "Skipping view transition because viewport size changed." || e.message === "Transition was aborted because of invalid state") && (e = null);
					}
					e !== null && c(e);
				} finally {
					r(), i(), o();
				}
			}), u.finished.finally(function() {
				for (var e = 0; e < d.length; e++) d[e].cancel();
				l.__reactViewTransition === u && (l.__reactViewTransition = null), s();
			}), u;
		} catch {
			return r(), i(), o(), null;
		}
	}
	function Np(e, t) {
		this._scope = document.documentElement, this._selector = "::view-transition-" + e + "(" + t + ")";
	}
	Np.prototype.animate = function(e, t) {
		return t = typeof t == "number" ? { duration: t } : D({}, t), t.pseudoElement = this._selector, this._scope.animate(e, t);
	}, Np.prototype.getAnimations = function() {
		for (var e = this._scope, t = this._selector, n = e.getAnimations({ subtree: !0 }), r = [], i = 0; i < n.length; i++) {
			var a = n[i].effect;
			a !== null && a.target === e && a.pseudoElement === t && r.push(n[i]);
		}
		return r;
	}, Np.prototype.getComputedStyle = function() {
		return getComputedStyle(this._scope, this._selector);
	};
	function Pp(e) {
		return {
			name: e,
			group: new Np("group", e),
			imagePair: new Np("image-pair", e),
			old: new Np("old", e),
			new: new Np("new", e)
		};
	}
	function Fp(e) {
		this._fragmentFiber = e, this._observers = this._eventListeners = null;
	}
	Fp.prototype.addEventListener = function(e, t, n) {
		var r = null, i = null;
		if (!(n != null && typeof n != "boolean" && (r = n.signal || null, r !== null && r.aborted))) {
			this._eventListeners === null && (this._eventListeners = []);
			var a = this._eventListeners;
			if (Bp(a, e, t, n) === -1) {
				var o = this, s = t;
				n != null && typeof n != "boolean" && !0 === n.once && (s = function(r) {
					o.removeEventListener(e, t, n), typeof t == "function" ? t.call(this, r) : t.handleEvent(r);
				}), r !== null && (i = o.removeEventListener.bind(o, e, t, n), r.addEventListener("abort", i, { once: !0 }), i = r.removeEventListener.bind(r, "abort", i)), r = Rp(n), a.push({
					type: e,
					listener: t,
					optionsOrUseCapture: n,
					attachedListener: s,
					cleanup: i
				}), h(this._fragmentFiber.child, !1, Ip, e, s, r);
			}
			this._eventListeners = a;
		}
	};
	function Ip(e, t, n, r) {
		return b(e).addEventListener(t, n, r), !1;
	}
	Fp.prototype.removeEventListener = function(e, t, n) {
		var r = this._eventListeners;
		if (r !== null && (t = Bp(r, e, t, n), t !== -1)) {
			var i = r[t];
			n = i.attachedListener;
			var a = i.cleanup;
			i = Rp(i.optionsOrUseCapture), h(this._fragmentFiber.child, !1, Lp, e, n, i), r.splice(t, 1), a !== null && a();
		}
	};
	function Lp(e, t, n, r) {
		return b(e).removeEventListener(t, n, r), !1;
	}
	function Rp(e) {
		return e != null && typeof e != "boolean" && (!0 === e.once || e.signal instanceof AbortSignal) ? {
			capture: e.capture,
			passive: e.passive
		} : e;
	}
	function zp(e) {
		return e == null ? "c=0" : typeof e == "boolean" ? "c=" + (e ? "1" : "0") : "c=" + (e.capture ? "1" : "0");
	}
	function Bp(e, t, n, r) {
		if (e.length === 0) return -1;
		r = zp(r);
		for (var i = 0; i < e.length; i++) {
			var a = e[i];
			if (a.type === t && a.listener === n && zp(a.optionsOrUseCapture) === r) return i;
		}
		return -1;
	}
	Fp.prototype.dispatchEvent = function(e) {
		var t = g(this._fragmentFiber);
		if (t === null) return !0;
		t = b(t);
		var n = this._eventListeners;
		if (n !== null && 0 < n.length || !e.bubbles) {
			var r = t.nodeType === 9 ? t.createComment("") : document.createTextNode("");
			if (n) for (var i = 0; i < n.length; i++) {
				var a = n[i];
				r.addEventListener(a.type, a.attachedListener, Rp(a.optionsOrUseCapture));
			}
			if (t.appendChild(r), e = r.dispatchEvent(e), n) for (i = 0; i < n.length; i++) a = n[i], r.removeEventListener(a.type, a.attachedListener, Rp(a.optionsOrUseCapture));
			return t.removeChild(r), e;
		}
		return t.dispatchEvent(e);
	}, Fp.prototype.focus = function(e) {
		h(this._fragmentFiber.child, !0, Vp, e, void 0, void 0);
	};
	function Vp(e, t) {
		return e.tag !== 6 && (e = b(e), pm(e, t));
	}
	Fp.prototype.focusLast = function(e) {
		var t = [];
		h(this._fragmentFiber.child, !0, Hp, t, void 0, void 0);
		for (var n = t.length - 1; 0 <= n && !Vp(t[n], e); n--);
	};
	function Hp(e, t) {
		return t.push(e), !1;
	}
	Fp.prototype.blur = function() {
		var e = g(this._fragmentFiber);
		e !== null && (e = b(e), e = lp(e).activeElement, e !== null && h(this._fragmentFiber.child, !1, Up, e, void 0, void 0));
	};
	function Up(e, t) {
		return e.tag !== 6 && (e = b(e), e === t || e.contains(t) ? (t.blur(), !0) : !1);
	}
	Fp.prototype.observeUsing = function(e) {
		this._observers === null && (this._observers = /* @__PURE__ */ new Set()), this._observers.add(e), h(this._fragmentFiber.child, !1, Wp, e, void 0, void 0);
	};
	function Wp(e, t) {
		return e.tag === 6 || (e = b(e), t.observe(e)), !1;
	}
	Fp.prototype.unobserveUsing = function(e) {
		var t = this._observers;
		if (t !== null && t.has(e)) {
			t.delete(e), h(this._fragmentFiber.child, !1, Gp, e, void 0, void 0);
			for (var n = t = 0; n < Kp.length; n++) {
				var r = Kp[n];
				r.fragmentInstance === this && r.observer === e ? e.unobserve(r.instance) : Kp[t++] = r;
			}
			Kp.length = t;
		}
	};
	function Gp(e, t) {
		return e.tag === 6 || (e = b(e), t.unobserve(e)), !1;
	}
	var Kp = [], qp = !1;
	function Jp(e, t, n) {
		Kp.push({
			fragmentInstance: e,
			observer: t,
			instance: n
		}), qp || (qp = !0, mm(function() {
			qp = !1;
			var e = Kp;
			Kp = [];
			for (var t = 0; t < e.length; t++) {
				var n = e[t];
				n.observer.unobserve(n.instance);
			}
		}));
	}
	Fp.prototype.getClientRects = function() {
		var e = [];
		return h(this._fragmentFiber.child, !1, Yp, e, void 0, void 0), e;
	};
	function Yp(e, t) {
		if (e.tag === 6) {
			e = e.stateNode;
			var n = e.ownerDocument.createRange();
			n.selectNodeContents(e), t.push.apply(t, n.getClientRects());
		} else e = b(e), t.push.apply(t, e.getClientRects());
		return !1;
	}
	Fp.prototype.getRootNode = function(e) {
		var t = g(this._fragmentFiber);
		return t === null ? this : b(t).getRootNode(e);
	}, Fp.prototype.compareDocumentPosition = function(e) {
		var t = g(this._fragmentFiber);
		if (t === null) return Node.DOCUMENT_POSITION_DISCONNECTED;
		var n = [];
		h(this._fragmentFiber.child, !1, Hp, n, void 0, void 0);
		var r = b(t);
		if (n.length === 0) {
			if (n = r, _(this._fragmentFiber)) {
				a: {
					for (t = this._fragmentFiber.return; t !== null;) {
						if (t.tag === 4) {
							t = t.stateNode.containerInfo;
							break a;
						}
						if (t.tag === 3 || t.tag === 5 || t.tag === 27) break;
						t = t.return;
					}
					t = null;
				}
				t != null && (n = t);
			}
			t = this._fragmentFiber;
			var i = r = n.compareDocumentPosition(e);
			return n === e ? i = Node.DOCUMENT_POSITION_CONTAINS : r & Node.DOCUMENT_POSITION_CONTAINED_BY && (n = v(t)[1], n === null ? i = Node.DOCUMENT_POSITION_PRECEDING : (e = b(n).compareDocumentPosition(e), i = e === 0 || e & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING)), i |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
		}
		t = b(n[0]), i = b(n[n.length - 1]);
		var a = _(this._fragmentFiber) ? t.parentElement : r;
		if (a == null) return Node.DOCUMENT_POSITION_DISCONNECTED;
		r = a.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_CONTAINED_BY, a = a.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_CONTAINED_BY;
		var o = t.compareDocumentPosition(e), s = i.compareDocumentPosition(e), c = o & Node.DOCUMENT_POSITION_CONTAINED_BY || s & Node.DOCUMENT_POSITION_CONTAINED_BY;
		return s = r && a && o & Node.DOCUMENT_POSITION_FOLLOWING && s & Node.DOCUMENT_POSITION_PRECEDING, t = r && t === e || a && i === e || c || s ? Node.DOCUMENT_POSITION_CONTAINED_BY : !r && t === e || !a && i === e ? Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : o, t & Node.DOCUMENT_POSITION_DISCONNECTED || t & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC || Xp(t, this._fragmentFiber, n[0], n[n.length - 1], e) ? t : Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
	};
	function Xp(e, t, n, r, i) {
		var a = Pt(i);
		if (e & Node.DOCUMENT_POSITION_CONTAINED_BY) {
			if (n = !!a) a: {
				for (; a !== null;) {
					if (a.tag === 7 && (a === t || a.alternate === t)) {
						n = !0;
						break a;
					}
					a = a.return;
				}
				n = !1;
			}
			return n;
		}
		if (e & Node.DOCUMENT_POSITION_CONTAINS) {
			if (a === null) return a = i.ownerDocument, i === a || i === a.documentElement || i === a.body;
			a: {
				for (a = t, t = g(t); a !== null;) {
					if (!(a.tag !== 5 && a.tag !== 3 && a.tag !== 27 || a !== t && a.alternate !== t)) {
						a = !0;
						break a;
					}
					a = a.return;
				}
				a = !1;
			}
			return a;
		}
		return e & Node.DOCUMENT_POSITION_PRECEDING ? ((t = !!a) && !(t = a === n) && (t = E(n, a, T), t === null ? t = !1 : (h(t, !0, C, a, n), a = x, x = null, t = a !== null)), t) : e & Node.DOCUMENT_POSITION_FOLLOWING ? ((t = !!a) && !(t = a === r) && (t = E(r, a, T), t === null ? t = !1 : (h(t, !0, w, a, r), a = x, S = x = null, t = a !== null)), t) : !1;
	}
	function Zp(e, t) {
		var n = e.ownerDocument.createRange();
		n.selectNodeContents(e), e = n.getBoundingClientRect(), window.scrollTo(window.scrollX + e.left, t ? window.scrollY + e.top : window.scrollY + e.bottom - window.innerHeight);
	}
	Fp.prototype.scrollIntoView = function(e) {
		if (typeof e == "object") throw Error(s(566));
		var t = [];
		h(this._fragmentFiber.child, !1, Hp, t, void 0, void 0);
		var n = !1 !== e;
		if (t.length === 0) {
			var r = v(this._fragmentFiber);
			if (r = n ? r[1] || r[0] || g(this._fragmentFiber) : r[0] || r[1], r === null) return;
			if (r.tag === 6) {
				e = b(r), Zp(e, n);
				return;
			}
			if (r = b(r), r.nodeType !== 9) {
				if (r.nodeType === 11) {
					n = "host" in r ? r.host : null, n !== null && n.scrollIntoView(e);
					return;
				}
				r.scrollIntoView(e);
			}
		}
		for (r = n ? t.length - 1 : 0; r !== (n ? -1 : t.length);) {
			var i = t[r];
			i.tag === 6 ? (i = b(i), Zp(i, n)) : b(i).scrollIntoView(e), r += n ? -1 : 1;
		}
	};
	function Qp(e, t) {
		return e = b(e), $p(e, t), !1;
	}
	function $p(e, t) {
		e.reactFragments ?? (e.reactFragments = /* @__PURE__ */ new Set()), e.reactFragments.add(t);
	}
	function em(e, t) {
		var n = t._eventListeners;
		if (n !== null) for (var r = 0; r < n.length; r++) {
			var i = n[r];
			e.addEventListener(i.type, i.attachedListener, Rp(i.optionsOrUseCapture));
		}
		e.nodeType !== 3 && (n = t._observers, n !== null && n.forEach(function(n) {
			for (var r = 0, i = 0; i < Kp.length; i++) {
				var a = Kp[i];
				(a.fragmentInstance !== t || a.observer !== n || a.instance !== e) && (Kp[r++] = a);
			}
			Kp.length = r, n.observe(e);
		}), $p(e, t));
	}
	function tm(e, t) {
		var n = t._eventListeners;
		if (n !== null) for (var r = 0; r < n.length; r++) {
			var i = n[r];
			e.removeEventListener(i.type, i.attachedListener, Rp(i.optionsOrUseCapture));
		}
		e.nodeType !== 3 && (n = t._observers, n !== null && n.forEach(function(n) {
			typeof n.rootMargin == "string" ? Jp(t, n, e) : n.unobserve(e);
		}), e.reactFragments != null && e.reactFragments.delete(t));
	}
	function nm(e) {
		var t = e.firstChild;
		for (t && t.nodeType === 10 && (t = t.nextSibling); t;) {
			var n = t;
			switch (t = t.nextSibling, n.nodeName) {
				case "HTML":
				case "HEAD":
				case "BODY":
					nm(n), Nt(n);
					continue;
				case "SCRIPT":
				case "STYLE": continue;
				case "LINK": if (n.rel.toLowerCase() === "stylesheet") continue;
			}
			e.removeChild(n);
		}
	}
	function rm(e, t, n, r) {
		for (; e.nodeType === 1;) {
			var i = n;
			if (e.nodeName.toLowerCase() !== t.toLowerCase()) {
				if (!r && (e.nodeName !== "INPUT" || e.type !== "hidden")) break;
			} else if (!r) {
				if (t === "input" && e.type === "hidden") {
					var a = i.name == null ? null : "" + i.name;
					if (i.type === "hidden" && e.getAttribute("name") === a) return e;
				} else return e;
			} else if (!e[jt]) switch (t) {
				case "meta":
					if (!e.hasAttribute("itemprop")) break;
					return e;
				case "link":
					if (a = e.getAttribute("rel"), a === "stylesheet" && e.hasAttribute("data-precedence") || a !== i.rel || e.getAttribute("href") !== (i.href == null || i.href === "" ? null : i.href) || e.getAttribute("crossorigin") !== (i.crossOrigin == null ? null : i.crossOrigin) || e.getAttribute("title") !== (i.title == null ? null : i.title)) break;
					return e;
				case "style":
					if (e.hasAttribute("data-precedence")) break;
					return e;
				case "script":
					if (a = e.getAttribute("src"), (a !== (i.src == null ? null : i.src) || e.getAttribute("type") !== (i.type == null ? null : i.type) || e.getAttribute("crossorigin") !== (i.crossOrigin == null ? null : i.crossOrigin)) && a && e.hasAttribute("async") && !e.hasAttribute("itemprop")) break;
					return e;
				default: return e;
			}
			if (e = lm(e.nextSibling), e === null) break;
		}
		return null;
	}
	function im(e, t, n) {
		if (t === "") return null;
		for (; e.nodeType !== 3;) if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !n || (e = lm(e.nextSibling), e === null)) return null;
		return e;
	}
	function am(e, t) {
		for (; e.nodeType !== 8;) if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !t || (e = lm(e.nextSibling), e === null)) return null;
		return e;
	}
	function om(e) {
		return e.data === "$?" || e.data === "$~";
	}
	function sm(e) {
		return e.data === "$!" || e.data === "$?" && e.ownerDocument.readyState !== "loading";
	}
	function cm(e, t) {
		var n = e.ownerDocument;
		if (e.data === "$~") e._reactRetry = t;
		else if (e.data !== "$?" || n.readyState !== "loading") t();
		else {
			var r = function() {
				t(), n.removeEventListener("DOMContentLoaded", r);
			};
			n.addEventListener("DOMContentLoaded", r), e._reactRetry = r;
		}
	}
	function lm(e) {
		for (; e != null; e = e.nextSibling) {
			var t = e.nodeType;
			if (t === 1 || t === 3) break;
			if (t === 8) {
				if (t = e.data, t === "$" || t === "$!" || t === "$?" || t === "$~" || t === "&" || t === "F!" || t === "F") break;
				if (t === "/$" || t === "/&") return null;
			}
		}
		return e;
	}
	var um = null;
	function dm(e) {
		e = e.nextSibling;
		for (var t = 0; e;) {
			if (e.nodeType === 8) {
				var n = e.data;
				if (n === "/$" || n === "/&") {
					if (t === 0) return lm(e.nextSibling);
					t--;
				} else n !== "$" && n !== "$!" && n !== "$?" && n !== "$~" && n !== "&" || t++;
			}
			e = e.nextSibling;
		}
		return null;
	}
	function fm(e) {
		e = e.previousSibling;
		for (var t = 0; e;) {
			if (e.nodeType === 8) {
				var n = e.data;
				if (n === "$" || n === "$!" || n === "$?" || n === "$~" || n === "&") {
					if (t === 0) return e;
					t--;
				} else n !== "/$" && n !== "/&" || t++;
			}
			e = e.previousSibling;
		}
		return null;
	}
	function pm(e, t) {
		function n() {
			r = !0;
		}
		if (e.ownerDocument.activeElement === e) return !0;
		var r = !1;
		try {
			e.ownerDocument.addEventListener("focus", n, !0), (e.focus || HTMLElement.prototype.focus).call(e, t);
		} finally {
			e.ownerDocument.removeEventListener("focus", n, !0);
		}
		return r;
	}
	function mm(e) {
		yp(function() {
			yp(function(t) {
				return e(t);
			});
		});
	}
	function hm(e, t, n) {
		switch (t = lp(n), e) {
			case "html":
				if (e = t.documentElement, !e) throw Error(s(452));
				return e;
			case "head":
				if (e = t.head, !e) throw Error(s(453));
				return e;
			case "body":
				if (e = t.body, !e) throw Error(s(454));
				return e;
			default: throw Error(s(451));
		}
	}
	function gm(e, t, n) {
		for (var r in n) {
			var i = n[r];
			n.hasOwnProperty(r) && i != null && $(e, t, r, null, rp, i);
		}
		n.dangerouslySetInnerHTML != null && (e.textContent = ""), e.onclick === bn && (e.onclick = null), Nt(e);
	}
	function _m(e) {
		for (var t = e.attributes; t.length;) e.removeAttributeNode(t[0]);
		Nt(e);
	}
	var vm = /* @__PURE__ */ new Map(), ym = /* @__PURE__ */ new Set();
	function bm(e) {
		if (typeof e.getRootNode == "function") {
			var t = e.getRootNode();
			if (t.nodeType === 9 || t.nodeType === 11) return t;
		}
		return e.nodeType === 9 ? e : e.ownerDocument;
	}
	var xm = P.d;
	P.d = {
		f: Sm,
		r: Cm,
		D: Em,
		C: Dm,
		L: Om,
		m: km,
		X: jm,
		S: Am,
		M: Mm
	};
	function Sm() {
		var e = xm.f(), t = zd();
		return e || t;
	}
	function Cm(e) {
		var t = Ft(e);
		t !== null && t.tag === 5 && t.type === "form" ? rc(t) : xm.r(e);
	}
	var wm = typeof document > "u" ? null : document;
	function Tm(e, t, n) {
		var r = wm;
		if (r && typeof t == "string" && t) {
			var i = an(t);
			i = "link[rel=\"" + e + "\"][href=\"" + i + "\"]", typeof n == "string" && (i += "[crossorigin=\"" + n + "\"]"), ym.has(i) || (ym.add(i), e = {
				rel: e,
				crossOrigin: n,
				href: t
			}, r.querySelector(i) === null && (t = r.createElement("link"), np(t, "link", e), Rt(t), r.head.appendChild(t)));
		}
	}
	function Em(e) {
		xm.D(e), Tm("dns-prefetch", e, null);
	}
	function Dm(e, t) {
		xm.C(e, t), Tm("preconnect", e, t);
	}
	function Om(e, t, n) {
		xm.L(e, t, n);
		var r = wm;
		if (r && e && t) {
			var i = "link[rel=\"preload\"][as=\"" + an(t) + "\"]";
			t === "image" && n && n.imageSrcSet ? (i += "[imagesrcset=\"" + an(n.imageSrcSet) + "\"]", typeof n.imageSizes == "string" && (i += "[imagesizes=\"" + an(n.imageSizes) + "\"]")) : i += "[href=\"" + an(e) + "\"]";
			var a = i;
			switch (t) {
				case "style":
					a = Pm(e);
					break;
				case "script": a = Rm(e);
			}
			if (!(vm.has(a) || (e = D({
				rel: "preload",
				href: t === "image" && n && n.imageSrcSet ? void 0 : e,
				as: t
			}, n), vm.set(a, e), r.querySelector(i) !== null || t === "style" && r.querySelector(Fm(a)) || t === "script" && r.querySelector(zm(a))))) {
				var o = r.createElement("link");
				np(o, "link", e), t === "style" && (o[Mt] = !0, o.onload = o.onerror = function() {
					zt(o);
				}), Rt(o), r.head.appendChild(o);
			}
		}
	}
	function km(e, t) {
		xm.m(e, t);
		var n = wm;
		if (n && e) {
			var r = t && typeof t.as == "string" ? t.as : "script", i = "link[rel=\"modulepreload\"][as=\"" + an(r) + "\"][href=\"" + an(e) + "\"]", a = i;
			switch (r) {
				case "audioworklet":
				case "paintworklet":
				case "serviceworker":
				case "sharedworker":
				case "worker":
				case "script": a = Rm(e);
			}
			if (!vm.has(a) && (e = D({
				rel: "modulepreload",
				href: e
			}, t), vm.set(a, e), n.querySelector(i) === null)) {
				switch (r) {
					case "audioworklet":
					case "paintworklet":
					case "serviceworker":
					case "sharedworker":
					case "worker":
					case "script": if (n.querySelector(zm(a))) return;
				}
				r = n.createElement("link"), np(r, "link", e), Rt(r), n.head.appendChild(r);
			}
		}
	}
	function Am(e, t, n) {
		xm.S(e, t, n);
		var r = wm;
		if (r && e) {
			var i = Lt(r).hoistableStyles, a = Pm(e);
			t = t || "default";
			var o = i.get(a);
			if (!o) {
				var s = {
					loading: 0,
					preload: null
				};
				if (o = r.querySelector(Fm(a))) s.loading = 5;
				else {
					e = D({
						rel: "stylesheet",
						href: e,
						"data-precedence": t
					}, n), (n = vm.get(a)) && Hm(e, n);
					var c = o = r.createElement("link");
					Rt(c), np(c, "link", e), c._p = new Promise(function(e, t) {
						c.onload = e, c.onerror = t;
					}), c.addEventListener("load", function() {
						s.loading |= 1;
					}), c.addEventListener("error", function() {
						s.loading |= 2;
					}), s.loading |= 4, Vm(o, t, r);
				}
				o = {
					type: "stylesheet",
					instance: o,
					count: 1,
					state: s
				}, i.set(a, o);
			}
		}
	}
	function jm(e, t) {
		xm.X(e, t);
		var n = wm;
		if (n && e) {
			var r = Lt(n).hoistableScripts, i = Rm(e), a = r.get(i);
			a || (a = n.querySelector(zm(i)), a || (e = D({
				src: e,
				async: !0
			}, t), (t = vm.get(i)) && Um(e, t), a = n.createElement("script"), Rt(a), np(a, "link", e), n.head.appendChild(a)), a = {
				type: "script",
				instance: a,
				count: 1,
				state: null
			}, r.set(i, a));
		}
	}
	function Mm(e, t) {
		xm.M(e, t);
		var n = wm;
		if (n && e) {
			var r = Lt(n).hoistableScripts, i = Rm(e), a = r.get(i);
			a || (a = n.querySelector(zm(i)), a || (e = D({
				src: e,
				async: !0,
				type: "module"
			}, t), (t = vm.get(i)) && Um(e, t), a = n.createElement("script"), Rt(a), np(a, "link", e), n.head.appendChild(a)), a = {
				type: "script",
				instance: a,
				count: 1,
				state: null
			}, r.set(i, a));
		}
	}
	function Nm(e, t, n, r) {
		var i = (i = Te.current) ? bm(i) : null;
		if (!i) throw Error(s(446));
		switch (e) {
			case "meta":
			case "title": return null;
			case "style": return typeof n.precedence == "string" && typeof n.href == "string" ? (n = Pm(n.href), t = Lt(i).hoistableStyles, r = t.get(n), r || (r = {
				type: "style",
				instance: null,
				count: 0,
				state: null
			}, t.set(n, r)), r) : {
				type: "void",
				instance: null,
				count: 0,
				state: null
			};
			case "link":
				if (n.rel === "stylesheet" && typeof n.href == "string" && typeof n.precedence == "string") {
					e = Pm(n.href);
					var a = Lt(i).hoistableStyles, o = a.get(e);
					if (o || (i = i.ownerDocument || i, o = {
						type: "stylesheet",
						instance: null,
						count: 0,
						state: {
							loading: 0,
							preload: null
						}
					}, a.set(e, o), (a = i.querySelector(Fm(e))) ? a._p || (o.instance = a, o.state.loading = 5) : (a = vm.get(e), a || (a = {
						rel: "preload",
						as: "style",
						href: n.href,
						crossOrigin: n.crossOrigin,
						integrity: n.integrity,
						media: n.media,
						hrefLang: n.hrefLang,
						referrerPolicy: n.referrerPolicy
					}, vm.set(e, a)), Lm(i, e, a, o.state))), t && r === null) throw Error(s(528, ""));
					return o;
				}
				if (t && r !== null) throw Error(s(529, ""));
				return null;
			case "script": return t = n.async, n = n.src, typeof n == "string" && t && typeof t != "function" && typeof t != "symbol" ? (n = Rm(n), t = Lt(i).hoistableScripts, r = t.get(n), r || (r = {
				type: "script",
				instance: null,
				count: 0,
				state: null
			}, t.set(n, r)), r) : {
				type: "void",
				instance: null,
				count: 0,
				state: null
			};
			default: throw Error(s(444, e));
		}
	}
	function Pm(e) {
		return "href=\"" + an(e) + "\"";
	}
	function Fm(e) {
		return "link[rel=\"stylesheet\"][" + e + "]";
	}
	function Im(e) {
		return D({}, e, {
			"data-precedence": e.precedence,
			precedence: null
		});
	}
	function Lm(e, t, n, r) {
		if (t = e.querySelector("link[rel=\"preload\"][as=\"style\"][" + t + "]")) {
			if (!0 !== t[Mt]) {
				r.loading = 1;
				return;
			}
		} else t = e.createElement("link"), t[Mt] = !0, t.onload = t.onerror = zt.bind(null, t), np(t, "link", n), Rt(t), e.head.appendChild(t);
		r.preload = t, t.addEventListener("load", function() {
			return r.loading |= 1;
		}), t.addEventListener("error", function() {
			return r.loading |= 2;
		});
	}
	function Rm(e) {
		return "[src=\"" + an(e) + "\"]";
	}
	function zm(e) {
		return "script[async]" + e;
	}
	function Bm(e, t, n) {
		if (t.count++, t.instance === null) switch (t.type) {
			case "style":
				var r = e.querySelector("style[data-href~=\"" + an(n.href) + "\"]");
				if (r) return t.instance = r, Rt(r), r;
				var i = D({}, n, {
					"data-href": n.href,
					"data-precedence": n.precedence,
					href: null,
					precedence: null
				});
				return r = (e.ownerDocument || e).createElement("style"), Rt(r), np(r, "style", i), Vm(r, n.precedence, e), t.instance = r;
			case "stylesheet":
				i = Pm(n.href);
				var a = e.querySelector(Fm(i));
				if (a) return t.state.loading |= 4, t.instance = a, Rt(a), a;
				r = Im(n), (i = vm.get(i)) && Hm(r, i), a = (e.ownerDocument || e).createElement("link"), Rt(a);
				var o = a;
				return o._p = new Promise(function(e, t) {
					o.onload = e, o.onerror = t;
				}), np(a, "link", r), t.state.loading |= 4, Vm(a, n.precedence, e), t.instance = a;
			case "script": return a = Rm(n.src), (i = e.querySelector(zm(a))) ? (t.instance = i, Rt(i), i) : (r = n, (i = vm.get(a)) && (r = D({}, n), Um(r, i)), e = e.ownerDocument || e, i = e.createElement("script"), Rt(i), np(i, "link", r), e.head.appendChild(i), t.instance = i);
			case "void": return null;
			default: throw Error(s(443, t.type));
		}
		else t.type === "stylesheet" && !(t.state.loading & 4) && (r = t.instance, t.state.loading |= 4, Vm(r, n.precedence, e));
		return t.instance;
	}
	function Vm(e, t, n) {
		for (var r = n.querySelectorAll("link[rel=\"stylesheet\"][data-precedence],style[data-precedence]"), i = r.length ? r[r.length - 1] : null, a = i, o = 0; o < r.length; o++) {
			var s = r[o];
			if (s.dataset.precedence === t) a = s;
			else if (a !== i) break;
		}
		a ? a.parentNode.insertBefore(e, a.nextSibling) : (t = n.nodeType === 9 ? n.head : n, t.insertBefore(e, t.firstChild));
	}
	function Hm(e, t) {
		e.crossOrigin ?? (e.crossOrigin = t.crossOrigin), e.referrerPolicy ?? (e.referrerPolicy = t.referrerPolicy), e.title ?? (e.title = t.title);
	}
	function Um(e, t) {
		e.crossOrigin ?? (e.crossOrigin = t.crossOrigin), e.referrerPolicy ?? (e.referrerPolicy = t.referrerPolicy), e.integrity ?? (e.integrity = t.integrity);
	}
	var Wm = null;
	function Gm(e, t, n) {
		if (Wm === null) {
			var r = /* @__PURE__ */ new Map(), i = Wm = /* @__PURE__ */ new Map();
			i.set(n, r);
		} else i = Wm, r = i.get(n), r || (r = /* @__PURE__ */ new Map(), i.set(n, r));
		if (r.has(e)) return r;
		for (r.set(e, null), n = n.getElementsByTagName(e), i = 0; i < n.length; i++) {
			var a = n[i];
			if (!(a[jt] || a[wt] || e === "link" && a.getAttribute("rel") === "stylesheet") && a.namespaceURI !== "http://www.w3.org/2000/svg") {
				var o = a.getAttribute(t) || "";
				o = e + o;
				var s = r.get(o);
				s ? s.push(a) : r.set(o, [a]);
			}
		}
		return r;
	}
	function Km(e, t, n) {
		e = e.ownerDocument || e, e.head.insertBefore(n, t === "title" ? e.querySelector("head > title") : null);
	}
	function qm(e, t, n) {
		if (n === 1 || t.itemProp != null) return !1;
		switch (e) {
			case "meta":
			case "title": return !0;
			case "style":
				if (typeof t.precedence != "string" || typeof t.href != "string" || t.href === "") break;
				return !0;
			case "link":
				if (typeof t.rel != "string" || typeof t.href != "string" || t.href === "" || t.onLoad || t.onError) break;
				switch (t.rel) {
					case "stylesheet": return e = t.disabled, typeof t.precedence == "string" && e == null;
					default: return !0;
				}
			case "script": if (t.async && typeof t.async != "function" && typeof t.async != "symbol" && !t.onLoad && !t.onError && t.src && typeof t.src == "string") return !0;
		}
		return !1;
	}
	function Jm(e, t) {
		return e === "img" && t.src != null && t.src !== "" && t.onLoad == null && t.loading !== "lazy";
	}
	function Ym(e) {
		return !(e.type === "stylesheet" && !(e.state.loading & 3));
	}
	function Xm(e) {
		return (e.width || 100) * (e.height || 100) * (typeof devicePixelRatio == "number" ? devicePixelRatio : 1) * .25;
	}
	function Zm(e, t) {
		typeof t.decode == "function" && (e.imgCount++, t.complete || (e.imgBytes += Xm(t), e.suspenseyImages.push(t)), e = rh.bind(e), t.decode().then(e, e));
	}
	function Qm(e, t, n, r) {
		if (n.type === "stylesheet" && (typeof r.media != "string" || !1 !== matchMedia(r.media).matches) && !(n.state.loading & 4)) {
			if (n.instance === null) {
				var i = Pm(r.href), a = t.querySelector(Fm(i));
				if (a) {
					t = a._p, typeof t == "object" && t && typeof t.then == "function" && (e.count++, e = nh.bind(e), t.then(e, e)), n.state.loading |= 4, n.instance = a, Rt(a);
					return;
				}
				a = t.ownerDocument || t, r = Im(r), (i = vm.get(i)) && Hm(r, i), a = a.createElement("link"), Rt(a);
				var o = a;
				o._p = new Promise(function(e, t) {
					o.onload = e, o.onerror = t;
				}), np(a, "link", r), n.instance = a;
			}
			e.stylesheets === null && (e.stylesheets = /* @__PURE__ */ new Map()), e.stylesheets.set(n, t), (t = n.state.preload) && !(n.state.loading & 3) && (e.count++, n = nh.bind(e), t.addEventListener("load", n), t.addEventListener("error", n));
		}
	}
	var $m = 0;
	function eh(e, t) {
		return e.stylesheets && e.count === 0 && ah(e, e.stylesheets), 0 < e.count || 0 < e.imgCount ? function(n) {
			var r = setTimeout(function() {
				if (e.stylesheets && ah(e, e.stylesheets), e.unsuspend) {
					var t = e.unsuspend;
					e.unsuspend = null, t();
				}
			}, 6e4 + t);
			0 < e.imgBytes && $m === 0 && ($m = 62500 * op());
			var i = setTimeout(function() {
				if (e.waitingForImages = !1, e.count === 0 && (e.stylesheets && ah(e, e.stylesheets), e.unsuspend)) {
					var t = e.unsuspend;
					e.unsuspend = null, t();
				}
			}, (e.imgBytes > $m ? 50 : 800) + t);
			return e.unsuspend = n, function() {
				e.unsuspend = null, clearTimeout(r), clearTimeout(i);
			};
		} : null;
	}
	function th(e) {
		if (e.count === 0 && (e.imgCount === 0 || !e.waitingForImages)) {
			if (e.stylesheets) ah(e, e.stylesheets);
			else if (e.unsuspend) {
				var t = e.unsuspend;
				e.unsuspend = null, t();
			}
		}
	}
	function nh() {
		this.count--, th(this);
	}
	function rh() {
		this.imgCount--, th(this);
	}
	var ih = null;
	function ah(e, t) {
		e.stylesheets = null, e.unsuspend !== null && (e.count++, ih = /* @__PURE__ */ new Map(), t.forEach(oh, e), ih = null, nh.call(e));
	}
	function oh(e, t) {
		if (!(t.state.loading & 4)) {
			var n = ih.get(e);
			if (n) var r = n.get(null);
			else {
				n = /* @__PURE__ */ new Map(), ih.set(e, n);
				for (var i = e.querySelectorAll("link[data-precedence],style[data-precedence]"), a = 0; a < i.length; a++) {
					var o = i[a];
					(o.nodeName === "LINK" || o.getAttribute("media") !== "not all") && (n.set(o.dataset.precedence, o), r = o);
				}
				r && n.set(null, r);
			}
			i = t.instance, o = i.getAttribute("data-precedence"), a = n.get(o) || r, a === r && n.set(null, i), n.set(o, i), this.count++, r = nh.bind(this), i.addEventListener("load", r), i.addEventListener("error", r), a ? a.parentNode.insertBefore(i, a.nextSibling) : (e = e.nodeType === 9 ? e.head : e, e.insertBefore(i, e.firstChild)), t.state.loading |= 4;
		}
	}
	var sh = {
		$$typeof: M,
		Provider: null,
		Consumer: null,
		_currentValue: ve,
		_currentValue2: ve,
		_threadCount: 0
	};
	function ch(e, t, n, r, i, a, o, s, c) {
		this.tag = 1, this.containerInfo = e, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = pt(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = pt(0), this.hiddenUpdates = pt(null), this.identifierPrefix = r, this.onUncaughtError = i, this.onCaughtError = a, this.onRecoverableError = o, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = c, this.transitionTypes = null, this.incompleteTransitions = /* @__PURE__ */ new Map();
	}
	function lh(e, t, n, r, i, a, o, s, c, l, u, d) {
		return e = new ch(e, t, n, o, c, l, u, d, s), t = 1, !0 === a && (t |= 24), a = Ni(3, null, null, t), e.current = a, a.stateNode = e, t = Ma(), t.refCount++, e.pooledCache = t, t.refCount++, a.memoizedState = {
			element: r,
			isDehydrated: n,
			cache: t
		}, ho(a), e;
	}
	function uh(e) {
		return e ? (e = ji, e) : ji;
	}
	function dh(e, t, n, r, i, a) {
		i = uh(i), r.context === null ? r.context = i : r.pendingContext = i, r = _o(t), r.payload = { element: n }, a = a === void 0 ? null : a, a !== null && (r.callback = a), n = vo(e, r, t), n !== null && (Pd(n, e, t), yo(n, e, t));
	}
	function fh(e, t) {
		if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
			var n = e.retryLane;
			e.retryLane = n !== 0 && n < t ? n : t;
		}
	}
	function ph(e, t) {
		fh(e, t), (e = e.alternate) && fh(e, t);
	}
	function mh(e) {
		if (e.tag === 13 || e.tag === 31) {
			var t = Oi(e, 67108864);
			t !== null && Pd(t, e, 67108864), ph(e, 67108864);
		}
	}
	function hh(e) {
		if (e.tag === 13 || e.tag === 31) {
			var t = jd();
			t = yt(t);
			var n = Oi(e, t);
			n !== null && Pd(n, e, t), ph(e, t);
		}
	}
	var gh = !0;
	function _h(e, t, n, r) {
		var i = N.T;
		N.T = null;
		var a = P.p;
		try {
			P.p = 2, yh(e, t, n, r);
		} finally {
			P.p = a, N.T = i;
		}
	}
	function vh(e, t, n, r) {
		var i = N.T;
		N.T = null;
		var a = P.p;
		try {
			P.p = 8, yh(e, t, n, r);
		} finally {
			P.p = a, N.T = i;
		}
	}
	function yh(e, t, n, r) {
		if (gh) {
			var i = bh(r);
			if (i === null) Kf(e, t, r, xh, n), Mh(e, r);
			else if (Ph(i, e, t, n, r)) r.stopPropagation();
			else if (Mh(e, r), t & 4 && -1 < jh.indexOf(e)) {
				for (; i !== null;) {
					var a = Ft(i);
					if (a !== null) switch (a.tag) {
						case 3:
							if (a = a.stateNode, a.current.memoizedState.isDehydrated) {
								var o = st(a.pendingLanes);
								if (o !== 0) {
									var s = a;
									for (s.pendingLanes |= 2, s.entangledLanes |= 2; o;) {
										var c = 1 << 31 - et(o);
										s.entanglements[1] |= c, o &= ~c;
									}
									Ef(a), !(K & 6) && (gd = He() + 500, Df(0, !1));
								}
							}
							break;
						case 31:
						case 13: s = Oi(a, 2), s !== null && Pd(s, a, 2), zd(), ph(a, 2);
					}
					if (a = bh(r), a === null && Kf(e, t, r, xh, n), a === i) break;
					i = a;
				}
				i !== null && r.stopPropagation();
			} else Kf(e, t, r, null, n);
		}
	}
	function bh(e) {
		return e = Sn(e), Sh(e);
	}
	var xh = null;
	function Sh(e) {
		if (xh = null, e = Pt(e), e !== null) {
			var t = l(e);
			if (t === null) e = null;
			else {
				var n = t.tag;
				if (n === 13) {
					if (e = u(t), e !== null) return e;
					e = null;
				} else if (n === 31) {
					if (e = d(t), e !== null) return e;
					e = null;
				} else if (n === 3) {
					if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
					e = null;
				} else t !== e && (e = null);
			}
		}
		return xh = e, null;
	}
	function Ch(e) {
		switch (e) {
			case "beforetoggle":
			case "cancel":
			case "click":
			case "close":
			case "contextmenu":
			case "copy":
			case "cut":
			case "auxclick":
			case "dblclick":
			case "dragend":
			case "dragstart":
			case "drop":
			case "focusin":
			case "focusout":
			case "input":
			case "invalid":
			case "keydown":
			case "keypress":
			case "keyup":
			case "mousedown":
			case "mouseup":
			case "paste":
			case "pause":
			case "play":
			case "pointercancel":
			case "pointerdown":
			case "pointerup":
			case "ratechange":
			case "reset":
			case "seeked":
			case "submit":
			case "toggle":
			case "touchcancel":
			case "touchend":
			case "touchstart":
			case "volumechange":
			case "change":
			case "selectionchange":
			case "textInput":
			case "compositionstart":
			case "compositionend":
			case "compositionupdate":
			case "beforeblur":
			case "afterblur":
			case "beforeinput":
			case "blur":
			case "fullscreenchange":
			case "fullscreenerror":
			case "focus":
			case "hashchange":
			case "popstate":
			case "select":
			case "selectstart": return 2;
			case "drag":
			case "dragenter":
			case "dragexit":
			case "dragleave":
			case "dragover":
			case "mousemove":
			case "mouseout":
			case "mouseover":
			case "pointermove":
			case "pointerout":
			case "pointerover":
			case "resize":
			case "scroll":
			case "touchmove":
			case "wheel":
			case "mouseenter":
			case "mouseleave":
			case "pointerenter":
			case "pointerleave": return 8;
			case "message": switch (Ue()) {
				case We: return 2;
				case Ge: return 8;
				case Ke:
				case qe: return 32;
				case Je: return 268435456;
				default: return 32;
			}
			default: return 32;
		}
	}
	var wh = !1, Th = null, Eh = null, Dh = null, Oh = /* @__PURE__ */ new Map(), kh = /* @__PURE__ */ new Map(), Ah = [], jh = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(" ");
	function Mh(e, t) {
		switch (e) {
			case "focusin":
			case "focusout":
				Th = null;
				break;
			case "dragenter":
			case "dragleave":
				Eh = null;
				break;
			case "mouseover":
			case "mouseout":
				Dh = null;
				break;
			case "pointerover":
			case "pointerout":
				Oh.delete(t.pointerId);
				break;
			case "gotpointercapture":
			case "lostpointercapture": kh.delete(t.pointerId);
		}
	}
	function Nh(e, t, n, r, i, a) {
		return e === null || e.nativeEvent !== a ? (e = {
			blockedOn: t,
			domEventName: n,
			eventSystemFlags: r,
			nativeEvent: a,
			targetContainers: [i]
		}, t !== null && (t = Ft(t), t !== null && mh(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, i !== null && t.indexOf(i) === -1 && t.push(i), e);
	}
	function Ph(e, t, n, r, i) {
		switch (t) {
			case "focusin": return Th = Nh(Th, e, t, n, r, i), !0;
			case "dragenter": return Eh = Nh(Eh, e, t, n, r, i), !0;
			case "mouseover": return Dh = Nh(Dh, e, t, n, r, i), !0;
			case "pointerover":
				var a = i.pointerId;
				return Oh.set(a, Nh(Oh.get(a) || null, e, t, n, r, i)), !0;
			case "gotpointercapture": return a = i.pointerId, kh.set(a, Nh(kh.get(a) || null, e, t, n, r, i)), !0;
		}
		return !1;
	}
	function Fh(e) {
		var t = Pt(e.target);
		if (t !== null) {
			var n = l(t);
			if (n !== null) {
				if (t = n.tag, t === 13) {
					if (t = u(n), t !== null) {
						e.blockedOn = t, St(e.priority, function() {
							hh(n);
						});
						return;
					}
				} else if (t === 31) {
					if (t = d(n), t !== null) {
						e.blockedOn = t, St(e.priority, function() {
							hh(n);
						});
						return;
					}
				} else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
					e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
					return;
				}
			}
		}
		e.blockedOn = null;
	}
	function Ih(e) {
		if (e.blockedOn !== null) return !1;
		for (var t = e.targetContainers; 0 < t.length;) {
			var n = bh(e.nativeEvent);
			if (n === null) {
				n = e.nativeEvent;
				var r = new n.constructor(n.type, n);
				xn = r, n.target.dispatchEvent(r), xn = null;
			} else return t = Ft(n), t !== null && mh(t), e.blockedOn = n, !1;
			t.shift();
		}
		return !0;
	}
	function Lh(e, t, n) {
		Ih(e) && n.delete(t);
	}
	function Rh() {
		wh = !1, Th !== null && Ih(Th) && (Th = null), Eh !== null && Ih(Eh) && (Eh = null), Dh !== null && Ih(Dh) && (Dh = null), Oh.forEach(Lh), kh.forEach(Lh);
	}
	function zh(e, n) {
		e.blockedOn === n && (e.blockedOn = null, wh || (wh = !0, t.unstable_scheduleCallback(t.unstable_NormalPriority, Rh)));
	}
	var Bh = null;
	function Vh(e) {
		Bh !== e && (Bh = e, t.unstable_scheduleCallback(t.unstable_NormalPriority, function() {
			Bh === e && (Bh = null);
			for (var t = 0; t < e.length; t += 3) {
				var n = e[t], r = e[t + 1], i = e[t + 2];
				if (typeof r != "function") {
					if (Sh(r || n) === null) continue;
					break;
				}
				var a = Ft(n);
				a !== null && (e.splice(t, 3), t -= 3, tc(a, {
					pending: !0,
					data: i,
					method: n.method,
					action: r
				}, r, i));
			}
		}));
	}
	function Hh(e) {
		function t(t) {
			return zh(t, e);
		}
		Th !== null && zh(Th, e), Eh !== null && zh(Eh, e), Dh !== null && zh(Dh, e), Oh.forEach(t), kh.forEach(t);
		for (var n = 0; n < Ah.length; n++) {
			var r = Ah[n];
			r.blockedOn === e && (r.blockedOn = null);
		}
		for (; 0 < Ah.length && (n = Ah[0], n.blockedOn === null);) Fh(n), n.blockedOn === null && Ah.shift();
		if (n = (e.ownerDocument || e).$$reactFormReplay, n != null) for (r = 0; r < n.length; r += 3) {
			var i = n[r], a = n[r + 1], o = i[Tt] || null;
			if (typeof a == "function") o || Vh(n);
			else if (o) {
				var s = null;
				if (a && a.hasAttribute("formAction")) {
					if (i = a, o = a[Tt] || null) s = o.formAction;
					else if (Sh(i) !== null) continue;
				} else s = o.action;
				typeof s == "function" ? n[r + 1] = s : (n.splice(r, 3), r -= 3), Vh(n);
			}
		}
	}
	function Uh() {
		function e(e) {
			e.canIntercept && e.info === "react-transition" && e.intercept({
				handler: function() {
					return new Promise(function(e) {
						return i = e;
					});
				},
				focusReset: "manual",
				scroll: "manual"
			});
		}
		function t() {
			i !== null && (i(), i = null), r || setTimeout(n, 20);
		}
		function n() {
			if (!r && !navigation.transition) {
				var e = navigation.currentEntry;
				e && e.url != null && navigation.navigate(e.url, {
					state: e.getState(),
					info: "react-transition",
					history: "replace"
				});
			}
		}
		if (typeof navigation == "object") {
			var r = !1, i = null;
			return navigation.addEventListener("navigate", e), navigation.addEventListener("navigatesuccess", t), navigation.addEventListener("navigateerror", t), setTimeout(n, 100), function() {
				r = !0, navigation.removeEventListener("navigate", e), navigation.removeEventListener("navigatesuccess", t), navigation.removeEventListener("navigateerror", t), i !== null && (i(), i = null);
			};
		}
	}
	function Wh(e) {
		this._internalRoot = e;
	}
	Gh.prototype.render = Wh.prototype.render = function(e) {
		var t = this._internalRoot;
		if (t === null) throw Error(s(409));
		var n = t.current;
		dh(n, jd(), e, t, null, null);
	}, Gh.prototype.unmount = Wh.prototype.unmount = function() {
		var e = this._internalRoot;
		if (e !== null) {
			this._internalRoot = null;
			var t = e.containerInfo;
			dh(e.current, 2, null, e, null, null), zd(), t[Et] = null;
		}
	};
	function Gh(e) {
		this._internalRoot = e;
	}
	Gh.prototype.unstable_scheduleHydration = function(e) {
		if (e) {
			var t = xt();
			e = {
				blockedOn: null,
				target: e,
				priority: t
			};
			for (var n = 0; n < Ah.length && t !== 0 && t < Ah[n].priority; n++);
			Ah.splice(n, 0, e), n === 0 && Fh(e);
		}
	};
	var Kh = r.version;
	if (Kh !== "19.3.1") throw Error(s(527, Kh, "19.3.1"));
	P.findDOMNode = function(e) {
		var t = e._reactInternals;
		if (t === void 0) throw typeof e.render == "function" ? Error(s(188)) : (e = Object.keys(e).join(","), Error(s(268, e)));
		return e = p(t), e = e === null ? null : m(e), e = e === null ? null : e.stateNode, e;
	};
	var qh = {
		bundleType: 0,
		version: "19.3.1",
		rendererPackageName: "react-dom",
		currentDispatcherRef: N,
		reconcilerVersion: "19.3.1"
	};
	if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
		var Jh = __REACT_DEVTOOLS_GLOBAL_HOOK__;
		if (!Jh.isDisabled && Jh.supportsFiber) try {
			Ze = Jh.inject(qh), Qe = Jh;
		} catch {}
	}
	e.createRoot = function(e, t) {
		if (!c(e)) throw Error(s(299));
		var n = !1, r = "", i = wc, a = Tc, o = Ec;
		return t != null && (!0 === t.unstable_strictMode && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onUncaughtError !== void 0 && (i = t.onUncaughtError), t.onCaughtError !== void 0 && (a = t.onCaughtError), t.onRecoverableError !== void 0 && (o = t.onRecoverableError)), t = lh(e, 1, !1, null, null, n, r, null, i, a, o, Uh), e[Et] = t.current, Wf(e), new Wh(t);
	};
})), c = /* @__PURE__ */ e(((e, t) => {
	function n() {
		if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE == "function") try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
		} catch (e) {
			console.error(e);
		}
	}
	n(), t.exports = s();
})), l = i(), u = c();
function d(e) {
	"@babel/helpers - typeof";
	return d = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
		return typeof e;
	} : function(e) {
		return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
	}, d(e);
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/toPrimitive.js
function f(e, t) {
	if (d(e) != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (d(r) != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/toPropertyKey.js
function p(e) {
	var t = f(e, "string");
	return d(t) == "symbol" ? t : t + "";
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/defineProperty.js
function m(e, t, n) {
	return (t = p(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function h(e) {
	let t = window.PORTFOLIO_WALMEX_API;
	return (e || t || "http://127.0.0.1:8010/api/v1/walmex").replace(/\/+$/, "");
}
var g = class extends Error {
	constructor(e, t = 0) {
		super(e), m(this, "status", void 0), this.name = "ErrorApi", this.status = t;
	}
};
async function _(e, t) {
	let n;
	try {
		n = await fetch(e, {
			signal: t,
			headers: { Accept: "application/json" },
			mode: "cors",
			credentials: "omit"
		});
	} catch (e) {
		throw e.name === "AbortError" ? e : new g("No se pudo contactar con la API del portafolio. Comprueba que el backend esté en marcha (uvicorn app.main:app --port 8010) y que el origen esté permitido por CORS.");
	}
	if (!n.ok) {
		let e = `La API respondió ${n.status}.`;
		try {
			let t = await n.json();
			typeof t.detail == "string" && (e = t.detail);
		} catch {}
		throw new g(e, n.status);
	}
	return await n.json();
}
function v(e) {
	let t = new URLSearchParams();
	for (let n of e.mercados) t.append("mercado", n);
	e.desde && t.set("desde", e.desde), e.hasta && t.set("hasta", e.hasta), e.indicador && t.set("indicador", e.indicador), e.base && t.set("base", e.base);
	let n = t.toString();
	return n ? `?${n}` : "";
}
function y(e) {
	let t = (t, n) => `${e}${t}${v(n)}`;
	return {
		apiBase: e,
		estado: (t) => _(`${e}/estado`, t),
		catalogo: (t) => _(`${e}/catalogo`, t),
		resumen: (e, n) => _(t("/resumen", e), n),
		motores: (e, n) => _(t("/motores", e), n),
		desempeno: (e, n) => _(t("/desempeno", e), n),
		matriz: (e, n) => _(t("/matriz", e), n),
		fuentes: (t) => _(`${e}/fuentes`, t),
		urlExportar: (e) => t("/exportar", e)
	};
}
// src/dominio.ts
var b = "wm-", x = {
	consolidado: "Consolidado",
	mexico: "México",
	centroamerica: "Centroamérica"
}, S = {
	mexico: "#3458F5",
	centroamerica: "#8066E8",
	consolidado: "#596273"
}, C = "#0F7B5A", w = "#B4433F";
function T(e) {
	return Number(e.slice(0, 1));
}
var E = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
function D(e, t = 1) {
	return e.toLocaleString("es-MX", {
		minimumFractionDigits: t,
		maximumFractionDigits: t
	}).replace("-", "−");
}
function O(e) {
	return e == null || Number.isNaN(e) ? "No publicado" : E.format(e).replace("-", "−");
}
function k(e, t = 1) {
	return e == null || Number.isNaN(e) ? "No publicado" : `${e > 0 ? "+" : ""}${D(e, t)} %`;
}
function ee(e, t = 1) {
	return e == null || Number.isNaN(e) ? "No publicado" : `${D(e, t)} %`;
}
function A(e) {
	return e == null || Number.isNaN(e) ? "No publicado" : `${e > 0 ? "+" : ""}${D(e, 1)} pp`;
}
function te(e) {
	if (!e) return "sin fecha";
	let t = [
		"ene",
		"feb",
		"mar",
		"abr",
		"may",
		"jun",
		"jul",
		"ago",
		"sep",
		"oct",
		"nov",
		"dic"
	], [n, r, i] = e.split("-"), a = Number(r) - 1;
	return !n || !i || !t[a] ? e : `${Number(i)} ${t[a]} ${n}`;
}
function ne(e) {
	return e ? {
		nominal: "importe nominal",
		nominal_publicado: "variación publicada por la empresa",
		nominal_calculado: "variación calculada con importes",
		moneda_constante_publicado: "variación a moneda constante (empresa)",
		unidades_iguales_publicado: "unidades iguales publicadas",
		publicado_comunicado: "publicado en el comunicado"
	}[e] ?? e : "sin base declarada";
}
function j(e) {
	return Number(`20${e.slice(2)}`) * 10 + Number(e.slice(0, 1));
}
var M = {
	mercados: [],
	desde: null,
	hasta: null,
	indicador: null,
	base: null
};
function re(e) {
	let t = e.searchParams.get(`${b}vista`), n = (t) => e.searchParams.get(`${b}${t}`);
	return {
		vista: t === "motores" || t === "comparativa" || t === "resumen" ? t : "resumen",
		desde: n("desde"),
		hasta: n("hasta"),
		trimestre: n("trimestre"),
		baseIndice: n("indice-base"),
		indicador: n("indicador"),
		base: n("base"),
		mercado: n("mercado"),
		motores: n("motores"),
		estacional: n("estacional"),
		composicion: n("composicion"),
		calorMercado: n("calor-mercado"),
		calorModo: n("calor-modo")
	};
}
var ie = [
	"vista",
	"desde",
	"hasta",
	"trimestre",
	"indice-base",
	"indicador",
	"base",
	"mercado",
	"motores",
	"estacional",
	"composicion",
	"calor-mercado",
	"calor-modo"
];
function ae(e) {
	let t = new URL(window.location.href);
	for (let e of ie) t.searchParams.delete(`${b}${e}`);
	t.searchParams.set(`${b}vista`, e.vista);
	let n = [
		["desde", e.desde],
		["hasta", e.hasta],
		["trimestre", e.trimestre],
		["indice-base", e.baseIndice],
		["indicador", e.indicador],
		["base", e.base],
		["mercado", e.mercado],
		["motores", e.motores],
		["estacional", e.estacional],
		["composicion", e.composicion],
		["calor-mercado", e.calorMercado],
		["calor-modo", e.calorModo]
	];
	for (let [e, r] of n) r && t.searchParams.set(`${b}${e}`, r);
	window.history.replaceState({}, "", t.toString());
}
function oe(e, t, n) {
	let r = t ? j(t) : -Infinity, i = n ? j(n) : Infinity;
	return e.filter((e) => j(e) >= r && j(e) <= i);
}
function se(e, t) {
	let n = `${t[0]}T${Number(t.slice(2)) - 1}`;
	return e.includes(n) ? n : null;
}
// src/analisis.ts
function ce(e, t) {
	return e.find((e) => e.mercado === t);
}
function le(e, t, n) {
	return ce(e, t)?.ingresos.find((e) => e.periodo === n)?.valor ?? null;
}
function ue(e, t, n) {
	return ce(e, t)?.crecimiento.find((e) => e.periodo === n)?.valor ?? null;
}
function de(e, t, n) {
	let r = se(t, n), i = r ? le(e, "consolidado", r) : null, a = le(e, "consolidado", n), o = i !== null && a !== null ? a - i : null, s = ["mexico", "centroamerica"].map((t) => {
		let i = r ? le(e, t, r) : null, a = le(e, t, n), s = i !== null && a !== null ? a - i : null, c = s !== null && o !== null && o !== 0 && Math.sign(s) === Math.sign(o);
		return {
			mercado: t,
			etiqueta: t === "mexico" ? "México" : "Centroamérica",
			importePrevio: i,
			importeActual: a,
			diferencia: s,
			participacion: c ? 100 * s / o : null,
			participacionInterpretable: c
		};
	}), c = s.reduce((e, t) => e + (t.diferencia ?? NaN), 0), l = i !== null && a !== null && s.every((e) => e.diferencia !== null), u = l && o !== null ? Math.round((c - o) * 1e3) / 1e3 : null;
	return {
		anterior: r,
		periodo: n,
		totalPrevio: i,
		totalActual: a,
		cambioTotal: o,
		crecimiento: i ? (o ?? 0) / i * 100 : null,
		aportaciones: s,
		residual: u,
		residualInterpretable: u !== null && Math.abs(u) > .5,
		concilia: u !== null && Math.abs(u) <= 1,
		calculable: l
	};
}
function fe(e, t) {
	return t.map((t) => ({
		periodo: t,
		mexico: le(e, "mexico", t),
		centroamerica: le(e, "centroamerica", t),
		total: le(e, "consolidado", t)
	}));
}
function pe(e, t) {
	let n = ce(e, t), r = new Map((n?.ingresos ?? []).map((e) => [e.periodo, e.valor])), i = new Map((n?.crecimiento ?? []).map((e) => [e.periodo, e.valor])), a = (n?.ingresos ?? []).map((e) => e.periodo).sort((e, t) => j(e) - j(t)), o = [...new Set(a.map((e) => 2e3 + Number(e.slice(2))))].sort(), s = [];
	for (let e of o) for (let t of [
		1,
		2,
		3,
		4
	]) {
		let n = `${t}T${String(e).slice(2)}`;
		a.includes(n) ? s.push({
			anio: e,
			trimestre: t,
			periodo: n,
			importe: r.get(n) ?? null,
			crecimiento: i.get(n) ?? null
		}) : s.push({
			anio: e,
			trimestre: t,
			periodo: n,
			importe: null,
			crecimiento: null
		});
	}
	let c = s.map((e) => e.importe).filter((e) => e !== null);
	return {
		anios: o,
		celdas: s,
		conImporte: c.length,
		conCrecimiento: s.filter((e) => e.crecimiento !== null).length,
		maximo: c.length ? Math.max(...c) : 0
	};
}
function me(e, t) {
	let n = [];
	for (let r of t) {
		let i = se(t, r);
		if (!i) continue;
		let a = le(e, "consolidado", i);
		if (!a) continue;
		let o = le(e, "mexico", r), s = le(e, "mexico", i), c = le(e, "centroamerica", r), l = le(e, "centroamerica", i), u = le(e, "consolidado", r);
		if (o === null || s === null || c === null || l === null || u === null) continue;
		let d = 100 * (o - s) / a, f = 100 * (c - l) / a, p = 100 * (u - a) / a;
		n.push({
			periodo: r,
			anterior: i,
			aporteMexico: d,
			aporteCentroamerica: f,
			residual: p - (d + f),
			crecimientoCalculado: p,
			crecimientoPublicado: ue(e, "consolidado", r)
		});
	}
	return n;
}
var he = [
	"trafico",
	"ticket",
	"mismas_tiendas"
];
function ge(e, t, n, r) {
	return e?.celdas.find((e) => e.indicador === t && e.mercado === n && e.periodo === r) ?? null;
}
function _e(e, t) {
	return he.map((n) => {
		let r = e?.indicadores.find((e) => e.clave === n), i = ge(e, n, "mexico", t)?.valor ?? null, a = ge(e, n, "centroamerica", t)?.valor ?? null;
		return {
			clave: n,
			etiqueta: n === "trafico" ? "Tráfico" : n === "ticket" ? "Ticket" : "Unidades iguales",
			definicion: n === "mismas_tiendas" ? "ventas a unidades iguales publicadas por la empresa" : "variación anual publicada por la empresa",
			base: r?.base ?? null,
			mexico: i,
			centroamerica: a,
			brecha: i !== null && a !== null ? i - a : null,
			periodo: t
		};
	});
}
function N(e, t) {
	return Object.fromEntries(he.map((n) => [n, t.map((t) => {
		let r = ge(e, n, "mexico", t)?.valor ?? null, i = ge(e, n, "centroamerica", t)?.valor ?? null;
		return {
			periodo: t,
			mexico: r,
			centroamerica: i,
			brecha: r !== null && i !== null ? r - i : null
		};
	})]));
}
function P(e, t, n) {
	let r = le(e, "mexico", n), i = le(e, "centroamerica", n);
	return t.map((t) => {
		let n = le(e, "mexico", t), a = le(e, "centroamerica", t);
		return {
			periodo: t,
			mexico: n !== null && r ? 100 * n / r : null,
			centroamerica: a !== null && i ? 100 * a / i : null
		};
	});
}
function ve(e, t) {
	return t.filter((t) => {
		let n = le(e, "mexico", t), r = le(e, "centroamerica", t);
		return n !== null && r !== null && n > 0 && r > 0;
	});
}
function ye(e) {
	if (!e.calculable || e.cambioTotal === null || e.totalPrevio === null) return null;
	let [t, n] = e.aportaciones;
	if (t.diferencia === null || n.diferencia === null) return null;
	let r = Math.sign(e.cambioTotal);
	if (Math.sign(t.diferencia) !== r || Math.sign(n.diferencia) !== r || e.cambioTotal === 0) return `El cambio del consolidado (${e.cambioTotal > 0 ? "+" : ""}${Math.round(e.cambioTotal)} M) mezcla aportaciones de distinto signo: no hay una participación única que repartir.`;
	let i = (t) => 100 * t / e.cambioTotal;
	return `El cambio de ${e.cambioTotal > 0 ? "+" : ""}${Math.round(e.cambioTotal).toLocaleString("es-MX")} M se reparte entre México (${i(t.diferencia).toFixed(1)} %) y Centroamérica (${i(n.diferencia).toFixed(1)} %)${e.residualInterpretable ? ", con un residual de redondeo" : ", sin residual"}.`;
}
// node_modules/d3-array/dist/d3-array.mjs
function be(e, t) {
	return e == null || t == null ? NaN : e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN;
}
function xe(e, t) {
	return e == null || t == null ? NaN : t < e ? -1 : t > e ? 1 : t >= e ? 0 : NaN;
}
function Se(e) {
	let t, n, r;
	e.length === 2 ? (t = e === be || e === xe ? e : F, n = e, r = e) : (t = be, n = (t, n) => be(e(t), n), r = (t, n) => e(t) - n);
	function i(e, r, i = 0, a = e.length) {
		if (i < a) {
			if (t(r, r) !== 0) return a;
			do {
				let t = i + a >>> 1;
				n(e[t], r) < 0 ? i = t + 1 : a = t;
			} while (i < a);
		}
		return i;
	}
	function a(e, r, i = 0, a = e.length) {
		if (i < a) {
			if (t(r, r) !== 0) return a;
			do {
				let t = i + a >>> 1;
				n(e[t], r) <= 0 ? i = t + 1 : a = t;
			} while (i < a);
		}
		return i;
	}
	function o(e, t, n = 0, a = e.length) {
		let o = i(e, t, n, a - 1);
		return o > n && r(e[o - 1], t) > -r(e[o], t) ? o - 1 : o;
	}
	return {
		left: i,
		center: o,
		right: a
	};
}
function F() {
	return 0;
}
function Ce(e) {
	return e === null ? NaN : +e;
}
var we = Se(be), Te = we.right;
we.left, Se(Ce).center;
var Ee = class extends Map {
	constructor(e, t = Ae) {
		if (super(), Object.defineProperties(this, {
			_intern: { value: /* @__PURE__ */ new Map() },
			_key: { value: t }
		}), e != null) for (let [t, n] of e) this.set(t, n);
	}
	get(e) {
		return super.get(De(this, e));
	}
	has(e) {
		return super.has(De(this, e));
	}
	set(e, t) {
		return super.set(Oe(this, e), t);
	}
	delete(e) {
		return super.delete(ke(this, e));
	}
};
function De({ _intern: e, _key: t }, n) {
	let r = t(n);
	return e.has(r) ? e.get(r) : n;
}
function Oe({ _intern: e, _key: t }, n) {
	let r = t(n);
	return e.has(r) ? e.get(r) : (e.set(r, n), n);
}
function ke({ _intern: e, _key: t }, n) {
	let r = t(n);
	return e.has(r) && (n = e.get(r), e.delete(r)), n;
}
function Ae(e) {
	return typeof e == "object" && e ? e.valueOf() : e;
}
Array.prototype.slice;
var je = Math.sqrt(50), Me = Math.sqrt(10), Ne = Math.sqrt(2);
function Pe(e, t, n) {
	let r = (t - e) / Math.max(0, n), i = Math.floor(Math.log10(r)), a = r / 10 ** i, o = a >= je ? 10 : a >= Me ? 5 : a >= Ne ? 2 : 1, s, c, l;
	return i < 0 ? (l = 10 ** -i / o, s = Math.round(e * l), c = Math.round(t * l), s / l < e && ++s, c / l > t && --c, l = -l) : (l = 10 ** i * o, s = Math.round(e / l), c = Math.round(t / l), s * l < e && ++s, c * l > t && --c), c < s && .5 <= n && n < 2 ? Pe(e, t, n * 2) : [
		s,
		c,
		l
	];
}
function Fe(e, t, n) {
	if (t = +t, e = +e, n = +n, !(n > 0)) return [];
	if (e === t) return [e];
	let r = t < e, [i, a, o] = r ? Pe(t, e, n) : Pe(e, t, n);
	if (!(a >= i)) return [];
	let s = a - i + 1, c = Array(s);
	if (r) {
		if (o < 0) for (let e = 0; e < s; ++e) c[e] = (a - e) / -o;
		else for (let e = 0; e < s; ++e) c[e] = (a - e) * o;
	} else if (o < 0) for (let e = 0; e < s; ++e) c[e] = (i + e) / -o;
	else for (let e = 0; e < s; ++e) c[e] = (i + e) * o;
	return c;
}
function Ie(e, t, n) {
	return t = +t, e = +e, n = +n, Pe(e, t, n)[2];
}
function Le(e, t, n) {
	t = +t, e = +e, n = +n;
	let r = t < e, i = r ? Ie(t, e, n) : Ie(e, t, n);
	return (r ? -1 : 1) * (i < 0 ? 1 / -i : i);
}
function Re(e, t, n) {
	e = +e, t = +t, n = (i = arguments.length) < 2 ? (t = e, e = 0, 1) : i < 3 ? 1 : +n;
	for (var r = -1, i = Math.max(0, Math.ceil((t - e) / n)) | 0, a = Array(i); ++r < i;) a[r] = e + r * n;
	return a;
}
// node_modules/d3-color/dist/d3-color.mjs
function I(e, t, n) {
	e.prototype = t.prototype = n, n.constructor = e;
}
function ze(e, t) {
	var n = Object.create(e.prototype);
	for (var r in t) n[r] = t[r];
	return n;
}
function Be() {}
var Ve = .7, He = 1 / Ve, Ue = "\\s*([+-]?\\d+)\\s*", We = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", Ge = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", Ke = /^#([0-9a-f]{3,8})$/, qe = RegExp(`^rgb\\(${Ue},${Ue},${Ue}\\)$`), Je = RegExp(`^rgb\\(${Ge},${Ge},${Ge}\\)$`), Ye = RegExp(`^rgba\\(${Ue},${Ue},${Ue},${We}\\)$`), Xe = RegExp(`^rgba\\(${Ge},${Ge},${Ge},${We}\\)$`), Ze = RegExp(`^hsl\\(${We},${Ge},${Ge}\\)$`), Qe = RegExp(`^hsla\\(${We},${Ge},${Ge},${We}\\)$`), $e = {
	aliceblue: 15792383,
	antiquewhite: 16444375,
	aqua: 65535,
	aquamarine: 8388564,
	azure: 15794175,
	beige: 16119260,
	bisque: 16770244,
	black: 0,
	blanchedalmond: 16772045,
	blue: 255,
	blueviolet: 9055202,
	brown: 10824234,
	burlywood: 14596231,
	cadetblue: 6266528,
	chartreuse: 8388352,
	chocolate: 13789470,
	coral: 16744272,
	cornflowerblue: 6591981,
	cornsilk: 16775388,
	crimson: 14423100,
	cyan: 65535,
	darkblue: 139,
	darkcyan: 35723,
	darkgoldenrod: 12092939,
	darkgray: 11119017,
	darkgreen: 25600,
	darkgrey: 11119017,
	darkkhaki: 12433259,
	darkmagenta: 9109643,
	darkolivegreen: 5597999,
	darkorange: 16747520,
	darkorchid: 10040012,
	darkred: 9109504,
	darksalmon: 15308410,
	darkseagreen: 9419919,
	darkslateblue: 4734347,
	darkslategray: 3100495,
	darkslategrey: 3100495,
	darkturquoise: 52945,
	darkviolet: 9699539,
	deeppink: 16716947,
	deepskyblue: 49151,
	dimgray: 6908265,
	dimgrey: 6908265,
	dodgerblue: 2003199,
	firebrick: 11674146,
	floralwhite: 16775920,
	forestgreen: 2263842,
	fuchsia: 16711935,
	gainsboro: 14474460,
	ghostwhite: 16316671,
	gold: 16766720,
	goldenrod: 14329120,
	gray: 8421504,
	green: 32768,
	greenyellow: 11403055,
	grey: 8421504,
	honeydew: 15794160,
	hotpink: 16738740,
	indianred: 13458524,
	indigo: 4915330,
	ivory: 16777200,
	khaki: 15787660,
	lavender: 15132410,
	lavenderblush: 16773365,
	lawngreen: 8190976,
	lemonchiffon: 16775885,
	lightblue: 11393254,
	lightcoral: 15761536,
	lightcyan: 14745599,
	lightgoldenrodyellow: 16448210,
	lightgray: 13882323,
	lightgreen: 9498256,
	lightgrey: 13882323,
	lightpink: 16758465,
	lightsalmon: 16752762,
	lightseagreen: 2142890,
	lightskyblue: 8900346,
	lightslategray: 7833753,
	lightslategrey: 7833753,
	lightsteelblue: 11584734,
	lightyellow: 16777184,
	lime: 65280,
	limegreen: 3329330,
	linen: 16445670,
	magenta: 16711935,
	maroon: 8388608,
	mediumaquamarine: 6737322,
	mediumblue: 205,
	mediumorchid: 12211667,
	mediumpurple: 9662683,
	mediumseagreen: 3978097,
	mediumslateblue: 8087790,
	mediumspringgreen: 64154,
	mediumturquoise: 4772300,
	mediumvioletred: 13047173,
	midnightblue: 1644912,
	mintcream: 16121850,
	mistyrose: 16770273,
	moccasin: 16770229,
	navajowhite: 16768685,
	navy: 128,
	oldlace: 16643558,
	olive: 8421376,
	olivedrab: 7048739,
	orange: 16753920,
	orangered: 16729344,
	orchid: 14315734,
	palegoldenrod: 15657130,
	palegreen: 10025880,
	paleturquoise: 11529966,
	palevioletred: 14381203,
	papayawhip: 16773077,
	peachpuff: 16767673,
	peru: 13468991,
	pink: 16761035,
	plum: 14524637,
	powderblue: 11591910,
	purple: 8388736,
	rebeccapurple: 6697881,
	red: 16711680,
	rosybrown: 12357519,
	royalblue: 4286945,
	saddlebrown: 9127187,
	salmon: 16416882,
	sandybrown: 16032864,
	seagreen: 3050327,
	seashell: 16774638,
	sienna: 10506797,
	silver: 12632256,
	skyblue: 8900331,
	slateblue: 6970061,
	slategray: 7372944,
	slategrey: 7372944,
	snow: 16775930,
	springgreen: 65407,
	steelblue: 4620980,
	tan: 13808780,
	teal: 32896,
	thistle: 14204888,
	tomato: 16737095,
	turquoise: 4251856,
	violet: 15631086,
	wheat: 16113331,
	white: 16777215,
	whitesmoke: 16119285,
	yellow: 16776960,
	yellowgreen: 10145074
};
I(Be, it, {
	copy(e) {
		return Object.assign(new this.constructor(), this, e);
	},
	displayable() {
		return this.rgb().displayable();
	},
	hex: et,
	formatHex: et,
	formatHex8: tt,
	formatHsl: nt,
	formatRgb: rt,
	toString: rt
});
function et() {
	return this.rgb().formatHex();
}
function tt() {
	return this.rgb().formatHex8();
}
function nt() {
	return _t(this).formatHsl();
}
function rt() {
	return this.rgb().formatRgb();
}
function it(e) {
	var t, n;
	return e = (e + "").trim().toLowerCase(), (t = Ke.exec(e)) ? (n = t[1].length, t = parseInt(t[1], 16), n === 6 ? at(t) : n === 3 ? new lt(t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, (t & 15) << 4 | t & 15, 1) : n === 8 ? ot(t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, (t & 255) / 255) : n === 4 ? ot(t >> 12 & 15 | t >> 8 & 240, t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, ((t & 15) << 4 | t & 15) / 255) : null) : (t = qe.exec(e)) ? new lt(t[1], t[2], t[3], 1) : (t = Je.exec(e)) ? new lt(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, 1) : (t = Ye.exec(e)) ? ot(t[1], t[2], t[3], t[4]) : (t = Xe.exec(e)) ? ot(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, t[4]) : (t = Ze.exec(e)) ? gt(t[1], t[2] / 100, t[3] / 100, 1) : (t = Qe.exec(e)) ? gt(t[1], t[2] / 100, t[3] / 100, t[4]) : $e.hasOwnProperty(e) ? at($e[e]) : e === "transparent" ? new lt(NaN, NaN, NaN, 0) : null;
}
function at(e) {
	return new lt(e >> 16 & 255, e >> 8 & 255, e & 255, 1);
}
function ot(e, t, n, r) {
	return r <= 0 && (e = t = n = NaN), new lt(e, t, n, r);
}
function st(e) {
	return e instanceof Be || (e = it(e)), e ? (e = e.rgb(), new lt(e.r, e.g, e.b, e.opacity)) : new lt();
}
function ct(e, t, n, r) {
	return arguments.length === 1 ? st(e) : new lt(e, t, n, r ?? 1);
}
function lt(e, t, n, r) {
	this.r = +e, this.g = +t, this.b = +n, this.opacity = +r;
}
I(lt, ct, ze(Be, {
	brighter(e) {
		return e = e == null ? He : He ** +e, new lt(this.r * e, this.g * e, this.b * e, this.opacity);
	},
	darker(e) {
		return e = e == null ? Ve : Ve ** +e, new lt(this.r * e, this.g * e, this.b * e, this.opacity);
	},
	rgb() {
		return this;
	},
	clamp() {
		return new lt(mt(this.r), mt(this.g), mt(this.b), pt(this.opacity));
	},
	displayable() {
		return -.5 <= this.r && this.r < 255.5 && -.5 <= this.g && this.g < 255.5 && -.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
	},
	hex: ut,
	formatHex: ut,
	formatHex8: dt,
	formatRgb: ft,
	toString: ft
}));
function ut() {
	return `#${ht(this.r)}${ht(this.g)}${ht(this.b)}`;
}
function dt() {
	return `#${ht(this.r)}${ht(this.g)}${ht(this.b)}${ht((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function ft() {
	let e = pt(this.opacity);
	return `${e === 1 ? "rgb(" : "rgba("}${mt(this.r)}, ${mt(this.g)}, ${mt(this.b)}${e === 1 ? ")" : `, ${e})`}`;
}
function pt(e) {
	return isNaN(e) ? 1 : Math.max(0, Math.min(1, e));
}
function mt(e) {
	return Math.max(0, Math.min(255, Math.round(e) || 0));
}
function ht(e) {
	return e = mt(e), (e < 16 ? "0" : "") + e.toString(16);
}
function gt(e, t, n, r) {
	return r <= 0 ? e = t = n = NaN : n <= 0 || n >= 1 ? e = t = NaN : t <= 0 && (e = NaN), new yt(e, t, n, r);
}
function _t(e) {
	if (e instanceof yt) return new yt(e.h, e.s, e.l, e.opacity);
	if (e instanceof Be || (e = it(e)), !e) return new yt();
	if (e instanceof yt) return e;
	e = e.rgb();
	var t = e.r / 255, n = e.g / 255, r = e.b / 255, i = Math.min(t, n, r), a = Math.max(t, n, r), o = NaN, s = a - i, c = (a + i) / 2;
	return s ? (o = t === a ? (n - r) / s + (n < r) * 6 : n === a ? (r - t) / s + 2 : (t - n) / s + 4, s /= c < .5 ? a + i : 2 - a - i, o *= 60) : s = c > 0 && c < 1 ? 0 : o, new yt(o, s, c, e.opacity);
}
function vt(e, t, n, r) {
	return arguments.length === 1 ? _t(e) : new yt(e, t, n, r ?? 1);
}
function yt(e, t, n, r) {
	this.h = +e, this.s = +t, this.l = +n, this.opacity = +r;
}
I(yt, vt, ze(Be, {
	brighter(e) {
		return e = e == null ? He : He ** +e, new yt(this.h, this.s, this.l * e, this.opacity);
	},
	darker(e) {
		return e = e == null ? Ve : Ve ** +e, new yt(this.h, this.s, this.l * e, this.opacity);
	},
	rgb() {
		var e = this.h % 360 + (this.h < 0) * 360, t = isNaN(e) || isNaN(this.s) ? 0 : this.s, n = this.l, r = n + (n < .5 ? n : 1 - n) * t, i = 2 * n - r;
		return new lt(St(e >= 240 ? e - 240 : e + 120, i, r), St(e, i, r), St(e < 120 ? e + 240 : e - 120, i, r), this.opacity);
	},
	clamp() {
		return new yt(bt(this.h), xt(this.s), xt(this.l), pt(this.opacity));
	},
	displayable() {
		return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
	},
	formatHsl() {
		let e = pt(this.opacity);
		return `${e === 1 ? "hsl(" : "hsla("}${bt(this.h)}, ${xt(this.s) * 100}%, ${xt(this.l) * 100}%${e === 1 ? ")" : `, ${e})`}`;
	}
}));
function bt(e) {
	return e = (e || 0) % 360, e < 0 ? e + 360 : e;
}
function xt(e) {
	return Math.max(0, Math.min(1, e || 0));
}
function St(e, t, n) {
	return (e < 60 ? t + (n - t) * e / 60 : e < 180 ? n : e < 240 ? t + (n - t) * (240 - e) / 60 : t) * 255;
}
var Ct = Math.PI / 180, wt = 180 / Math.PI, Tt = 18, Et = .96422, Dt = 1, Ot = .82521, kt = 4 / 29, At = 6 / 29, jt = 3 * At * At, Mt = At * At * At;
function Nt(e) {
	if (e instanceof Ft) return new Ft(e.l, e.a, e.b, e.opacity);
	if (e instanceof Ht) return Ut(e);
	e instanceof lt || (e = st(e));
	var t = zt(e.r), n = zt(e.g), r = zt(e.b), i = It((.2225045 * t + .7168786 * n + .0606169 * r) / Dt), a, o;
	return t === n && n === r ? a = o = i : (a = It((.4360747 * t + .3850649 * n + .1430804 * r) / Et), o = It((.0139322 * t + .0971045 * n + .7141733 * r) / Ot)), new Ft(116 * i - 16, 500 * (a - i), 200 * (i - o), e.opacity);
}
function Pt(e, t, n, r) {
	return arguments.length === 1 ? Nt(e) : new Ft(e, t, n, r ?? 1);
}
function Ft(e, t, n, r) {
	this.l = +e, this.a = +t, this.b = +n, this.opacity = +r;
}
I(Ft, Pt, ze(Be, {
	brighter(e) {
		return new Ft(this.l + Tt * (e ?? 1), this.a, this.b, this.opacity);
	},
	darker(e) {
		return new Ft(this.l - Tt * (e ?? 1), this.a, this.b, this.opacity);
	},
	rgb() {
		var e = (this.l + 16) / 116, t = isNaN(this.a) ? e : e + this.a / 500, n = isNaN(this.b) ? e : e - this.b / 200;
		return t = Et * Lt(t), e = Dt * Lt(e), n = Ot * Lt(n), new lt(Rt(3.1338561 * t - 1.6168667 * e - .4906146 * n), Rt(-.9787684 * t + 1.9161415 * e + .033454 * n), Rt(.0719453 * t - .2289914 * e + 1.4052427 * n), this.opacity);
	}
}));
function It(e) {
	return e > Mt ? e ** (1 / 3) : e / jt + kt;
}
function Lt(e) {
	return e > At ? e * e * e : jt * (e - kt);
}
function Rt(e) {
	return 255 * (e <= .0031308 ? 12.92 * e : 1.055 * e ** (1 / 2.4) - .055);
}
function zt(e) {
	return (e /= 255) <= .04045 ? e / 12.92 : ((e + .055) / 1.055) ** 2.4;
}
function Bt(e) {
	if (e instanceof Ht) return new Ht(e.h, e.c, e.l, e.opacity);
	if (e instanceof Ft || (e = Nt(e)), e.a === 0 && e.b === 0) return new Ht(NaN, 0 < e.l && e.l < 100 ? 0 : NaN, e.l, e.opacity);
	var t = Math.atan2(e.b, e.a) * wt;
	return new Ht(t < 0 ? t + 360 : t, Math.sqrt(e.a * e.a + e.b * e.b), e.l, e.opacity);
}
function Vt(e, t, n, r) {
	return arguments.length === 1 ? Bt(e) : new Ht(e, t, n, r ?? 1);
}
function Ht(e, t, n, r) {
	this.h = +e, this.c = +t, this.l = +n, this.opacity = +r;
}
function Ut(e) {
	if (isNaN(e.h)) return new Ft(e.l, 0, 0, e.opacity);
	var t = e.h * Ct;
	return new Ft(e.l, Math.cos(t) * e.c, Math.sin(t) * e.c, e.opacity);
}
I(Ht, Vt, ze(Be, {
	brighter(e) {
		return new Ht(this.h, this.c, this.l + Tt * (e ?? 1), this.opacity);
	},
	darker(e) {
		return new Ht(this.h, this.c, this.l - Tt * (e ?? 1), this.opacity);
	},
	rgb() {
		return Ut(this).rgb();
	}
}));
var Wt = -.14861, Gt = 1.78277, Kt = -.29227, qt = -.90649, L = 1.97294, Jt = L * qt, Yt = L * Gt, Xt = Gt * Kt - qt * Wt;
function Zt(e) {
	if (e instanceof $t) return new $t(e.h, e.s, e.l, e.opacity);
	e instanceof lt || (e = st(e));
	var t = e.r / 255, n = e.g / 255, r = e.b / 255, i = (Xt * r + Jt * t - Yt * n) / (Xt + Jt - Yt), a = r - i, o = (L * (n - i) - Kt * a) / qt, s = Math.sqrt(o * o + a * a) / (L * i * (1 - i)), c = s ? Math.atan2(o, a) * wt - 120 : NaN;
	return new $t(c < 0 ? c + 360 : c, s, i, e.opacity);
}
function Qt(e, t, n, r) {
	return arguments.length === 1 ? Zt(e) : new $t(e, t, n, r ?? 1);
}
function $t(e, t, n, r) {
	this.h = +e, this.s = +t, this.l = +n, this.opacity = +r;
}
I($t, Qt, ze(Be, {
	brighter(e) {
		return e = e == null ? He : He ** +e, new $t(this.h, this.s, this.l * e, this.opacity);
	},
	darker(e) {
		return e = e == null ? Ve : Ve ** +e, new $t(this.h, this.s, this.l * e, this.opacity);
	},
	rgb() {
		var e = isNaN(this.h) ? 0 : (this.h + 120) * Ct, t = +this.l, n = isNaN(this.s) ? 0 : this.s * t * (1 - t), r = Math.cos(e), i = Math.sin(e);
		return new lt(255 * (t + n * (Wt * r + Gt * i)), 255 * (t + n * (Kt * r + qt * i)), 255 * (t + L * r * n), this.opacity);
	}
}));
var en = (e) => () => e;
function tn(e, t) {
	return function(n) {
		return e + n * t;
	};
}
function nn(e, t, n) {
	return e **= +n, t = t ** +n - e, n = 1 / n, function(r) {
		return (e + r * t) ** +n;
	};
}
function rn(e, t) {
	var n = t - e;
	return n ? tn(e, n > 180 || n < -180 ? n - 360 * Math.round(n / 360) : n) : en(isNaN(e) ? t : e);
}
function an(e) {
	return (e = +e) == 1 ? on : function(t, n) {
		return n - t ? nn(t, n, e) : en(isNaN(t) ? n : t);
	};
}
function on(e, t) {
	var n = t - e;
	return n ? tn(e, n) : en(isNaN(e) ? t : e);
}
var sn = (function e(t) {
	var n = an(t);
	function r(e, t) {
		var r = n((e = ct(e)).r, (t = ct(t)).r), i = n(e.g, t.g), a = n(e.b, t.b), o = on(e.opacity, t.opacity);
		return function(t) {
			return e.r = r(t), e.g = i(t), e.b = a(t), e.opacity = o(t), e + "";
		};
	}
	return r.gamma = e, r;
})(1);
function cn(e, t) {
	t || (t = []);
	var n = e ? Math.min(t.length, e.length) : 0, r = t.slice(), i;
	return function(a) {
		for (i = 0; i < n; ++i) r[i] = e[i] * (1 - a) + t[i] * a;
		return r;
	};
}
function ln(e) {
	return ArrayBuffer.isView(e) && !(e instanceof DataView);
}
function un(e, t) {
	for (var n = t ? t.length : 0, r = e ? Math.min(n, e.length) : 0, i = Array(r), a = Array(n), o = 0; o < r; ++o) i[o] = yn(e[o], t[o]);
	for (; o < n; ++o) a[o] = t[o];
	return function(e) {
		for (o = 0; o < r; ++o) a[o] = i[o](e);
		return a;
	};
}
function dn(e, t) {
	var n = /* @__PURE__ */ new Date();
	return e = +e, t = +t, function(r) {
		return n.setTime(e * (1 - r) + t * r), n;
	};
}
function fn(e, t) {
	return e = +e, t = +t, function(n) {
		return e * (1 - n) + t * n;
	};
}
function pn(e, t) {
	var n = {}, r = {}, i;
	for (i in typeof e == "object" && e || (e = {}), typeof t == "object" && t || (t = {}), t) i in e ? n[i] = yn(e[i], t[i]) : r[i] = t[i];
	return function(e) {
		for (i in n) r[i] = n[i](e);
		return r;
	};
}
var mn = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, hn = new RegExp(mn.source, "g");
function gn(e) {
	return function() {
		return e;
	};
}
function _n(e) {
	return function(t) {
		return e(t) + "";
	};
}
function vn(e, t) {
	var n = mn.lastIndex = hn.lastIndex = 0, r, i, a, o = -1, s = [], c = [];
	for (e += "", t += ""; (r = mn.exec(e)) && (i = hn.exec(t));) (a = i.index) > n && (a = t.slice(n, a), s[o] ? s[o] += a : s[++o] = a), (r = r[0]) === (i = i[0]) ? s[o] ? s[o] += i : s[++o] = i : (s[++o] = null, c.push({
		i: o,
		x: fn(r, i)
	})), n = hn.lastIndex;
	return n < t.length && (a = t.slice(n), s[o] ? s[o] += a : s[++o] = a), s.length < 2 ? c[0] ? _n(c[0].x) : gn(t) : (t = c.length, function(e) {
		for (var n = 0, r; n < t; ++n) s[(r = c[n]).i] = r.x(e);
		return s.join("");
	});
}
function yn(e, t) {
	var n = typeof t, r;
	return t == null || n === "boolean" ? en(t) : (n === "number" ? fn : n === "string" ? (r = it(t)) ? (t = r, sn) : vn : t instanceof it ? sn : t instanceof Date ? dn : ln(t) ? cn : Array.isArray(t) ? un : typeof t.valueOf != "function" && typeof t.toString != "function" || isNaN(t) ? pn : fn)(e, t);
}
function bn(e, t) {
	return e = +e, t = +t, function(n) {
		return Math.round(e * (1 - n) + t * n);
	};
}
var xn = 1e-12;
function Sn(e) {
	return ((e = Math.exp(e)) + 1 / e) / 2;
}
function Cn(e) {
	return ((e = Math.exp(e)) - 1 / e) / 2;
}
function wn(e) {
	return ((e = Math.exp(2 * e)) - 1) / (e + 1);
}
(function e(t, n, r) {
	function i(e, i) {
		var a = e[0], o = e[1], s = e[2], c = i[0], l = i[1], u = i[2], d = c - a, f = l - o, p = d * d + f * f, m, h;
		if (p < xn) h = Math.log(u / s) / t, m = function(e) {
			return [
				a + e * d,
				o + e * f,
				s * Math.exp(t * e * h)
			];
		};
		else {
			var g = Math.sqrt(p), _ = (u * u - s * s + r * p) / (2 * s * n * g), v = (u * u - s * s - r * p) / (2 * u * n * g), y = Math.log(Math.sqrt(_ * _ + 1) - _);
			h = (Math.log(Math.sqrt(v * v + 1) - v) - y) / t, m = function(e) {
				var r = e * h, i = Sn(y), c = s / (n * g) * (i * wn(t * r + y) - Cn(y));
				return [
					a + c * d,
					o + c * f,
					s * i / Sn(t * r + y)
				];
			};
		}
		return m.duration = Math.abs(h) * 1e3 * t / Math.SQRT2, m;
	}
	return i.rho = function(t) {
		var n = Math.max(.001, +t), r = n * n;
		return e(n, r, r * r);
	}, i;
})(Math.SQRT2, 2, 4);
function Tn(e) {
	return (function t(n) {
		n = +n;
		function r(t, r) {
			var i = e((t = Qt(t)).h, (r = Qt(r)).h), a = on(t.s, r.s), o = on(t.l, r.l), s = on(t.opacity, r.opacity);
			return function(e) {
				return t.h = i(e), t.s = a(e), t.l = o(e ** +n), t.opacity = s(e), t + "";
			};
		}
		return r.gamma = t, r;
	})(1);
}
Tn(rn), Tn(on);
// node_modules/d3-format/dist/d3-format.mjs
function En(e) {
	return Math.abs(e = Math.round(e)) >= 1e21 ? e.toLocaleString("en").replace(/,/g, "") : e.toString(10);
}
function Dn(e, t) {
	if (!isFinite(e) || e === 0) return null;
	var n = (e = t ? e.toExponential(t - 1) : e.toExponential()).indexOf("e"), r = e.slice(0, n);
	return [r.length > 1 ? r[0] + r.slice(2) : r, +e.slice(n + 1)];
}
function On(e) {
	return e = Dn(Math.abs(e)), e ? e[1] : NaN;
}
function kn(e, t) {
	return function(n, r) {
		for (var i = n.length, a = [], o = 0, s = e[0], c = 0; i > 0 && s > 0 && (c + s + 1 > r && (s = Math.max(1, r - c)), a.push(n.substring(i -= s, i + s)), !((c += s + 1) > r));) s = e[o = (o + 1) % e.length];
		return a.reverse().join(t);
	};
}
function An(e) {
	return function(t) {
		return t.replace(/[0-9]/g, function(t) {
			return e[+t];
		});
	};
}
var jn = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;
function Mn(e) {
	if (!(t = jn.exec(e))) throw Error("invalid format: " + e);
	var t;
	return new Nn({
		fill: t[1],
		align: t[2],
		sign: t[3],
		symbol: t[4],
		zero: t[5],
		width: t[6],
		comma: t[7],
		precision: t[8] && t[8].slice(1),
		trim: t[9],
		type: t[10]
	});
}
Mn.prototype = Nn.prototype;
function Nn(e) {
	this.fill = e.fill === void 0 ? " " : e.fill + "", this.align = e.align === void 0 ? ">" : e.align + "", this.sign = e.sign === void 0 ? "-" : e.sign + "", this.symbol = e.symbol === void 0 ? "" : e.symbol + "", this.zero = !!e.zero, this.width = e.width === void 0 ? void 0 : +e.width, this.comma = !!e.comma, this.precision = e.precision === void 0 ? void 0 : +e.precision, this.trim = !!e.trim, this.type = e.type === void 0 ? "" : e.type + "";
}
Nn.prototype.toString = function() {
	return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (this.width === void 0 ? "" : Math.max(1, this.width | 0)) + (this.comma ? "," : "") + (this.precision === void 0 ? "" : "." + Math.max(0, this.precision | 0)) + (this.trim ? "~" : "") + this.type;
};
function Pn(e) {
	out: for (var t = e.length, n = 1, r = -1, i; n < t; ++n) switch (e[n]) {
		case ".":
			r = i = n;
			break;
		case "0":
			r === 0 && (r = n), i = n;
			break;
		default:
			if (!+e[n]) break out;
			r > 0 && (r = 0);
	}
	return r > 0 ? e.slice(0, r) + e.slice(i + 1) : e;
}
var Fn;
function In(e, t) {
	var n = Dn(e, t);
	if (!n) return Fn = void 0, e.toPrecision(t);
	var r = n[0], i = n[1], a = i - (Fn = Math.max(-8, Math.min(8, Math.floor(i / 3))) * 3) + 1, o = r.length;
	return a === o ? r : a > o ? r + Array(a - o + 1).join("0") : a > 0 ? r.slice(0, a) + "." + r.slice(a) : "0." + Array(1 - a).join("0") + Dn(e, Math.max(0, t + a - 1))[0];
}
function Ln(e, t) {
	var n = Dn(e, t);
	if (!n) return e + "";
	var r = n[0], i = n[1];
	return i < 0 ? "0." + Array(-i).join("0") + r : r.length > i + 1 ? r.slice(0, i + 1) + "." + r.slice(i + 1) : r + Array(i - r.length + 2).join("0");
}
var Rn = {
	"%": (e, t) => (e * 100).toFixed(t),
	b: (e) => Math.round(e).toString(2),
	c: (e) => e + "",
	d: En,
	e: (e, t) => e.toExponential(t),
	f: (e, t) => e.toFixed(t),
	g: (e, t) => e.toPrecision(t),
	o: (e) => Math.round(e).toString(8),
	p: (e, t) => Ln(e * 100, t),
	r: Ln,
	s: In,
	X: (e) => Math.round(e).toString(16).toUpperCase(),
	x: (e) => Math.round(e).toString(16)
};
function zn(e) {
	return e;
}
var Bn = Array.prototype.map, Vn = [
	"y",
	"z",
	"a",
	"f",
	"p",
	"n",
	"µ",
	"m",
	"",
	"k",
	"M",
	"G",
	"T",
	"P",
	"E",
	"Z",
	"Y"
];
function Hn(e) {
	var t = e.grouping === void 0 || e.thousands === void 0 ? zn : kn(Bn.call(e.grouping, Number), e.thousands + ""), n = e.currency === void 0 ? "" : e.currency[0] + "", r = e.currency === void 0 ? "" : e.currency[1] + "", i = e.decimal === void 0 ? "." : e.decimal + "", a = e.numerals === void 0 ? zn : An(Bn.call(e.numerals, String)), o = e.percent === void 0 ? "%" : e.percent + "", s = e.minus === void 0 ? "−" : e.minus + "", c = e.nan === void 0 ? "NaN" : e.nan + "";
	function l(e, l) {
		e = Mn(e);
		var u = e.fill, d = e.align, f = e.sign, p = e.symbol, m = e.zero, h = e.width, g = e.comma, _ = e.precision, v = e.trim, y = e.type;
		y === "n" ? (g = !0, y = "g") : Rn[y] || (_ === void 0 && (_ = 12), v = !0, y = "g"), (m || u === "0" && d === "=") && (m = !0, u = "0", d = "=");
		var b = (l && l.prefix !== void 0 ? l.prefix : "") + (p === "$" ? n : p === "#" && /[boxX]/.test(y) ? "0" + y.toLowerCase() : ""), x = (p === "$" ? r : /[%p]/.test(y) ? o : "") + (l && l.suffix !== void 0 ? l.suffix : ""), S = Rn[y], C = /[defgprs%]/.test(y);
		_ = _ === void 0 ? 6 : /[gprs]/.test(y) ? Math.max(1, Math.min(21, _)) : Math.max(0, Math.min(20, _));
		function w(e) {
			var n = b, r = x, o, l, p;
			if (y === "c") r = S(e) + r, e = "";
			else {
				e = +e;
				var w = e < 0 || 1 / e < 0;
				if (e = isNaN(e) ? c : S(Math.abs(e), _), v && (e = Pn(e)), w && +e == 0 && f !== "+" && (w = !1), n = (w ? f === "(" ? f : s : f === "-" || f === "(" ? "" : f) + n, r = (y === "s" && !isNaN(e) && Fn !== void 0 ? Vn[8 + Fn / 3] : "") + r + (w && f === "(" ? ")" : ""), C) {
					for (o = -1, l = e.length; ++o < l;) if (p = e.charCodeAt(o), 48 > p || p > 57) {
						r = (p === 46 ? i + e.slice(o + 1) : e.slice(o)) + r, e = e.slice(0, o);
						break;
					}
				}
			}
			g && !m && (e = t(e, Infinity));
			var T = n.length + e.length + r.length, E = T < h ? Array(h - T + 1).join(u) : "";
			switch (g && m && (e = t(E + e, E.length ? h - r.length : Infinity), E = ""), d) {
				case "<":
					e = n + e + r + E;
					break;
				case "=":
					e = n + E + e + r;
					break;
				case "^":
					e = E.slice(0, T = E.length >> 1) + n + e + r + E.slice(T);
					break;
				default: e = E + n + e + r;
			}
			return a(e);
		}
		return w.toString = function() {
			return e + "";
		}, w;
	}
	function u(e, t) {
		var n = Math.max(-8, Math.min(8, Math.floor(On(t) / 3))) * 3, r = 10 ** -n, i = l((e = Mn(e), e.type = "f", e), { suffix: Vn[8 + n / 3] });
		return function(e) {
			return i(r * e);
		};
	}
	return {
		format: l,
		formatPrefix: u
	};
}
var Un, Wn, Gn;
Kn({
	thousands: ",",
	grouping: [3],
	currency: ["$", ""]
});
function Kn(e) {
	return Un = Hn(e), Wn = Un.format, Gn = Un.formatPrefix, Un;
}
function qn(e) {
	return Math.max(0, -On(Math.abs(e)));
}
function Jn(e, t) {
	return Math.max(0, Math.max(-8, Math.min(8, Math.floor(On(t) / 3))) * 3 - On(Math.abs(e)));
}
function Yn(e, t) {
	return e = Math.abs(e), t = Math.abs(t) - e, Math.max(0, On(t) - On(e)) + 1;
}
// node_modules/d3-scale/dist/d3-scale.mjs
function Xn(e, t) {
	switch (arguments.length) {
		case 0: break;
		case 1:
			this.range(e);
			break;
		default: this.range(t).domain(e);
	}
	return this;
}
var Zn = Symbol("implicit");
function Qn() {
	var e = new Ee(), t = [], n = [], r = Zn;
	function i(i) {
		let a = e.get(i);
		if (a === void 0) {
			if (r !== Zn) return r;
			e.set(i, a = t.push(i) - 1);
		}
		return n[a % n.length];
	}
	return i.domain = function(n) {
		if (!arguments.length) return t.slice();
		t = [], e = new Ee();
		for (let r of n) e.has(r) || e.set(r, t.push(r) - 1);
		return i;
	}, i.range = function(e) {
		return arguments.length ? (n = Array.from(e), i) : n.slice();
	}, i.unknown = function(e) {
		return arguments.length ? (r = e, i) : r;
	}, i.copy = function() {
		return Qn(t, n).unknown(r);
	}, Xn.apply(i, arguments), i;
}
function $n() {
	var e = Qn().unknown(void 0), t = e.domain, n = e.range, r = 0, i = 1, a, o, s = !1, c = 0, l = 0, u = .5;
	delete e.unknown;
	function d() {
		var e = t().length, d = i < r, f = d ? i : r, p = d ? r : i;
		a = (p - f) / Math.max(1, e - c + l * 2), s && (a = Math.floor(a)), f += (p - f - a * (e - c)) * u, o = a * (1 - c), s && (f = Math.round(f), o = Math.round(o));
		var m = Re(e).map(function(e) {
			return f + a * e;
		});
		return n(d ? m.reverse() : m);
	}
	return e.domain = function(e) {
		return arguments.length ? (t(e), d()) : t();
	}, e.range = function(e) {
		return arguments.length ? ([r, i] = e, r = +r, i = +i, d()) : [r, i];
	}, e.rangeRound = function(e) {
		return [r, i] = e, r = +r, i = +i, s = !0, d();
	}, e.bandwidth = function() {
		return o;
	}, e.step = function() {
		return a;
	}, e.round = function(e) {
		return arguments.length ? (s = !!e, d()) : s;
	}, e.padding = function(e) {
		return arguments.length ? (c = Math.min(1, l = +e), d()) : c;
	}, e.paddingInner = function(e) {
		return arguments.length ? (c = Math.min(1, e), d()) : c;
	}, e.paddingOuter = function(e) {
		return arguments.length ? (l = +e, d()) : l;
	}, e.align = function(e) {
		return arguments.length ? (u = Math.max(0, Math.min(1, e)), d()) : u;
	}, e.copy = function() {
		return $n(t(), [r, i]).round(s).paddingInner(c).paddingOuter(l).align(u);
	}, Xn.apply(d(), arguments);
}
function er(e) {
	var t = e.copy;
	return e.padding = e.paddingOuter, delete e.paddingInner, delete e.paddingOuter, e.copy = function() {
		return er(t());
	}, e;
}
function tr() {
	return er($n.apply(null, arguments).paddingInner(1));
}
function nr(e) {
	return function() {
		return e;
	};
}
function rr(e) {
	return +e;
}
var ir = [0, 1];
function ar(e) {
	return e;
}
function or(e, t) {
	return (t -= e = +e) ? function(n) {
		return (n - e) / t;
	} : nr(isNaN(t) ? NaN : .5);
}
function sr(e, t) {
	var n;
	return e > t && (n = e, e = t, t = n), function(n) {
		return Math.max(e, Math.min(t, n));
	};
}
function cr(e, t, n) {
	var r = e[0], i = e[1], a = t[0], o = t[1];
	return i < r ? (r = or(i, r), a = n(o, a)) : (r = or(r, i), a = n(a, o)), function(e) {
		return a(r(e));
	};
}
function lr(e, t, n) {
	var r = Math.min(e.length, t.length) - 1, i = Array(r), a = Array(r), o = -1;
	for (e[r] < e[0] && (e = e.slice().reverse(), t = t.slice().reverse()); ++o < r;) i[o] = or(e[o], e[o + 1]), a[o] = n(t[o], t[o + 1]);
	return function(t) {
		var n = Te(e, t, 1, r) - 1;
		return a[n](i[n](t));
	};
}
function ur(e, t) {
	return t.domain(e.domain()).range(e.range()).interpolate(e.interpolate()).clamp(e.clamp()).unknown(e.unknown());
}
function dr() {
	var e = ir, t = ir, n = yn, r, i, a, o = ar, s, c, l;
	function u() {
		var n = Math.min(e.length, t.length);
		return o !== ar && (o = sr(e[0], e[n - 1])), s = n > 2 ? lr : cr, c = l = null, d;
	}
	function d(i) {
		return i == null || isNaN(i = +i) ? a : (c || (c = s(e.map(r), t, n)))(r(o(i)));
	}
	return d.invert = function(n) {
		return o(i((l || (l = s(t, e.map(r), fn)))(n)));
	}, d.domain = function(t) {
		return arguments.length ? (e = Array.from(t, rr), u()) : e.slice();
	}, d.range = function(e) {
		return arguments.length ? (t = Array.from(e), u()) : t.slice();
	}, d.rangeRound = function(e) {
		return t = Array.from(e), n = bn, u();
	}, d.clamp = function(e) {
		return arguments.length ? (o = e ? !0 : ar, u()) : o !== ar;
	}, d.interpolate = function(e) {
		return arguments.length ? (n = e, u()) : n;
	}, d.unknown = function(e) {
		return arguments.length ? (a = e, d) : a;
	}, function(e, t) {
		return r = e, i = t, u();
	};
}
function fr() {
	return dr()(ar, ar);
}
function pr(e, t, n, r) {
	var i = Le(e, t, n), a;
	switch (r = Mn(r ?? ",f"), r.type) {
		case "s":
			var o = Math.max(Math.abs(e), Math.abs(t));
			return r.precision == null && !isNaN(a = Jn(i, o)) && (r.precision = a), Gn(r, o);
		case "":
		case "e":
		case "g":
		case "p":
		case "r":
			r.precision == null && !isNaN(a = Yn(i, Math.max(Math.abs(e), Math.abs(t)))) && (r.precision = a - (r.type === "e"));
			break;
		case "f":
		case "%": r.precision == null && !isNaN(a = qn(i)) && (r.precision = a - (r.type === "%") * 2);
	}
	return Wn(r);
}
function mr(e) {
	var t = e.domain;
	return e.ticks = function(e) {
		var n = t();
		return Fe(n[0], n[n.length - 1], e ?? 10);
	}, e.tickFormat = function(e, n) {
		var r = t();
		return pr(r[0], r[r.length - 1], e ?? 10, n);
	}, e.nice = function(n) {
		n ?? (n = 10);
		var r = t(), i = 0, a = r.length - 1, o = r[i], s = r[a], c, l, u = 10;
		for (s < o && (l = o, o = s, s = l, l = i, i = a, a = l); u-- > 0;) {
			if (l = Ie(o, s, n), l === c) return r[i] = o, r[a] = s, t(r);
			if (l > 0) o = Math.floor(o / l) * l, s = Math.ceil(s / l) * l;
			else if (l < 0) o = Math.ceil(o * l) / l, s = Math.floor(s * l) / l;
			else break;
			c = l;
		}
		return e;
	}, e;
}
function hr() {
	var e = fr();
	return e.copy = function() {
		return ur(e, hr());
	}, Xn.apply(e, arguments), mr(e);
}
function gr(e) {
	return function(t) {
		return t < 0 ? -((-t) ** +e) : t ** +e;
	};
}
function _r(e) {
	return e < 0 ? -Math.sqrt(-e) : Math.sqrt(e);
}
function vr(e) {
	return e < 0 ? -e * e : e * e;
}
function yr(e) {
	var t = e(ar, ar), n = 1;
	function r() {
		return n === 1 ? e(ar, ar) : n === .5 ? e(_r, vr) : e(gr(n), gr(1 / n));
	}
	return t.exponent = function(e) {
		return arguments.length ? (n = +e, r()) : n;
	}, mr(t);
}
function br() {
	var e = yr(dr());
	return e.copy = function() {
		return ur(e, br()).exponent(e.exponent());
	}, Xn.apply(e, arguments), e;
}
function xr() {
	return br.apply(null, arguments).exponent(.5);
}
// node_modules/react/cjs/react-jsx-runtime.production.js
var Sr = /* @__PURE__ */ e(((e) => {
	var t = Symbol.for("react.transitional.element"), n = Symbol.for("react.fragment");
	function r(e, n, r) {
		var i = null;
		if (r !== void 0 && (i = "" + r), n.key !== void 0 && (i = "" + n.key), "key" in n) for (var a in r = {}, n) a !== "key" && (r[a] = n[a]);
		else r = n;
		return n = r.ref, {
			$$typeof: t,
			type: e,
			key: i,
			ref: n === void 0 ? null : n,
			props: r
		};
	}
	e.Fragment = n, e.jsx = r, e.jsxs = r;
})), R = (/* @__PURE__ */ e(((e, t) => {
	t.exports = Sr();
})))();
function Cr({ titulo: e, sub: t, controles: n, observacion: r, protagonista: i, testid: a, children: o }) {
	return /* @__PURE__ */ (0, R.jsxs)("article", {
		className: `wm-bloque${i ? " wm-bloque--protagonista" : ""}`,
		"data-testid": a,
		children: [
			/* @__PURE__ */ (0, R.jsxs)("header", {
				className: "wm-cabeza",
				children: [/* @__PURE__ */ (0, R.jsxs)("div", {
					className: "wm-cabeza-texto",
					children: [/* @__PURE__ */ (0, R.jsx)("h3", { children: e }), t ? /* @__PURE__ */ (0, R.jsx)("p", {
						className: "wm-cabeza-sub",
						children: t
					}) : null]
				}), n ? /* @__PURE__ */ (0, R.jsx)("div", {
					className: "wm-controles",
					children: n
				}) : null]
			}),
			/* @__PURE__ */ (0, R.jsx)("div", {
				className: "wm-cuerpo",
				children: o
			}),
			r ? /* @__PURE__ */ (0, R.jsx)("p", {
				className: "wm-observacion",
				children: r
			}) : null
		]
	});
}
// src/ui/comun.ts
function wr(e = 280) {
	let [t, n] = (0, l.useState)(null), [r, i] = (0, l.useState)(0), a = (0, l.useRef)(0), o = (0, l.useCallback)((e) => {
		n(e);
	}, []);
	return (0, l.useEffect)(() => {
		if (!t) return;
		let n = !0, r = (o) => {
			if (!n || !t.isConnected) return;
			let s = t.parentElement?.clientWidth ?? 0, c = document.documentElement.clientWidth || window.innerWidth, l = Math.round(o ?? t.clientWidth), u = Math.min(l, c > 0 ? c : l);
			s > 0 && (u = Math.min(u, s));
			let d = u <= 0 ? 0 : Math.max(s > 0 ? Math.min(e, s) : e, u);
			d !== a.current && (a.current = d, i(d), requestAnimationFrame(() => requestAnimationFrame(() => r())));
		};
		r();
		let o = requestAnimationFrame(() => r()), s = new ResizeObserver((e) => {
			let t = e[e.length - 1], n = t.contentBoxSize?.[0]?.inlineSize ?? t.contentRect?.width;
			r(n);
		});
		s.observe(t);
		let c = () => r(), l = () => r();
		return window.addEventListener("resize", c), document.addEventListener("toggle", l, !0), () => {
			n = !1, cancelAnimationFrame(o), s.disconnect(), window.removeEventListener("resize", c), document.removeEventListener("toggle", l, !0);
		};
	}, [t, e]), [o, r];
}
function Tr() {
	let [e, t] = (0, l.useState)(!1);
	return (0, l.useEffect)(() => {
		if (typeof window > "u" || !window.matchMedia) return;
		let e = window.matchMedia("(prefers-reduced-motion: reduce)"), n = () => t(e.matches);
		return n(), e.addEventListener("change", n), () => e.removeEventListener("change", n);
	}, []), e;
}
// src/ui/Tooltip.tsx
function Er({ x: e, y: t, children: n, visible: r, testid: i = "tooltip", ocultarAlDesplazar: a = !0 }) {
	let o = (0, l.useRef)(null), [s, c] = (0, l.useState)({
		left: e,
		top: t
	}), [u, d] = (0, l.useState)(!1);
	return (0, l.useEffect)(() => {
		if (!a) return;
		let e = () => d(!0);
		return window.addEventListener("scroll", e, { passive: !0 }), () => window.removeEventListener("scroll", e);
	}, [a]), (0, l.useEffect)(() => {
		d(!1);
	}, [
		e,
		t,
		r
	]), (0, l.useLayoutEffect)(() => {
		let n = o.current;
		if (!n || !r || u) return;
		let i = n.offsetWidth, a = n.offsetHeight, s = e + 14, l = t - a - 14;
		s + i > window.innerWidth - 12 && (s = e - i - 14), s < 12 && (s = 12), l < 12 && (l = t + 14), l + a > window.innerHeight - 12 && (l = Math.max(12, t - a - 14)), c({
			left: s,
			top: l
		});
	}, [
		e,
		t,
		r,
		n,
		u
	]), !r || u ? null : /* @__PURE__ */ (0, R.jsx)("div", {
		ref: o,
		className: "wm-tooltip",
		"data-testid": i,
		role: "tooltip",
		style: {
			left: s.left,
			top: s.top
		},
		children: n
	});
}
// src/ui/BrechaMotores.tsx
var Dr = [
	"trafico",
	"ticket",
	"mismas_tiendas"
], Or = {
	trafico: {
		nombre: "Tráfico",
		nota: "variación anual del tráfico"
	},
	ticket: {
		nombre: "Ticket",
		nota: "variación anual del ticket"
	},
	mismas_tiendas: {
		nombre: "Ventas mismas tiendas",
		nota: "variación de ventas a unidades iguales publicada por la empresa"
	}
}, kr = 64, Ar = {
	arriba: 14,
	derecha: 12,
	abajo: 20,
	izquierda: 44
};
function jr({ brechas: e, periodos: t, periodo: n, indicadorActivo: r, onSeleccionarPeriodo: i, onSeleccionar: a, onSeleccionarIndicador: o }) {
	let [s, c] = wr(280), [u, d] = (0, l.useState)(null), [f, p] = (0, l.useState)(null), [m, h] = (0, l.useState)(!0), g = Tr(), _ = Math.max(120, c - Ar.izquierda - Ar.derecha), v = $n().domain(t).range([0, _]).padding(t.length > 10 ? .42 : .34), y = (0, l.useMemo)(() => {
		let n = Object.values(e).flat().filter((e) => t.includes(e.periodo)).map((e) => e.brecha).filter((e) => e !== null).map((e) => Math.abs(e)), r = Math.max(.5, ...n);
		return Math.ceil(r * 1.1 * 2) / 2;
	}, [e, t]), b = hr().domain([-y, y]).range([kr, 0]), x = (0, l.useMemo)(() => {
		let e = [], n = "";
		for (let r of t) {
			let t = r.slice(2);
			t !== n && (n = t, e.push({
				anio: `20${t}`,
				inicio: r
			}));
		}
		return e;
	}, [t]), C = u ?? n, w = (t, n) => n ? e[t]?.find((e) => e.periodo === n) ?? null : null, T = (n) => (e[n] ?? []).filter((e) => t.includes(e.periodo) && e.brecha !== null).length, E = (e) => {
		let n = e.currentTarget.getBoundingClientRect(), r = e.clientX - n.left - Ar.izquierda, i = null, a = Infinity;
		for (let e of t) {
			let t = (v(e) ?? 0) + v.bandwidth() / 2, n = Math.abs(t - r);
			n < a && (a = n, i = e);
		}
		return i;
	}, O = (e) => {
		let t = E(e);
		t && (h(!0), d(t), p({
			x: e.clientX,
			y: e.clientY
		}));
	}, ee = (e) => {
		let r = u ?? n, a = t.indexOf(r), o = (n) => {
			let r = t[Math.max(0, Math.min(t.length - 1, n))];
			if (!r) return;
			h(!1), d(r);
			let i = e.currentTarget.getBoundingClientRect(), a = i.left + Ar.izquierda + (v(r) ?? 0) + v.bandwidth() / 2;
			p({
				x: a,
				y: i.top + i.height / 2
			});
		};
		e.key === "ArrowRight" ? (e.preventDefault(), o(a + 1)) : e.key === "ArrowLeft" ? (e.preventDefault(), o(a - 1)) : e.key === "Home" ? (e.preventDefault(), o(0)) : e.key === "End" ? (e.preventDefault(), o(t.length - 1)) : (e.key === "Enter" || e.key === " ") && (e.preventDefault(), u && i(u));
	}, te = (e) => {
		let r = t.length > (c < 480 ? 6 : 10) ? c < 480 ? 3 : 2 : 1, i = [], a = (e) => {
			e >= 0 && e < t.length && !i.includes(e) && i.push(e);
		};
		a(t.indexOf(n)), u && a(t.indexOf(u)), a(t.length - 1), a(0), t.forEach((e, t) => {
			t % r === 0 && a(t);
		});
		let o = [], s = [];
		for (let e of i) {
			let n = t[e], r = (v(n) ?? 0) + v.bandwidth() / 2, i = e === 0 ? "start" : e === t.length - 1 ? "end" : "middle", a = i === "start" ? r : i === "end" ? r - 30 : r - 15, c = a + 30;
			o.some((e) => a < e.x1 - 1 && c > e.x0 + 1) || (o.push({
				x0: a,
				x1: c
			}), s.push({
				p: n,
				centro: r,
				ancla: i
			}));
		}
		return s;
	};
	return (0, l.useEffect)(() => {
		u && !t.includes(u) && d(null);
	}, [t, u]), /* @__PURE__ */ (0, R.jsxs)(Cr, {
		testid: "bloque-brecha",
		titulo: "Dónde se abre la diferencia",
		sub: "México − Centroamérica · puntos porcentuales",
		controles: /* @__PURE__ */ (0, R.jsxs)("ul", {
			className: "wm-leyenda wm-leyenda--compacta",
			"data-testid": "brecha-leyenda",
			children: [/* @__PURE__ */ (0, R.jsxs)("li", { children: [/* @__PURE__ */ (0, R.jsx)("span", {
				className: "wm-punto-color",
				style: { background: S.mexico }
			}), " azul: mayor tasa en México"] }), /* @__PURE__ */ (0, R.jsxs)("li", { children: [
				/* @__PURE__ */ (0, R.jsx)("span", {
					className: "wm-punto-color",
					style: { background: S.centroamerica }
				}),
				" ",
				"violeta: mayor tasa en Centroamérica"
			] })]
		}),
		children: [/* @__PURE__ */ (0, R.jsx)("div", {
			className: "wm-brecha",
			ref: s,
			"data-testid": "brecha-grafica",
			children: c > 0 ? Dr.map((a) => {
				let o = t.map((t) => e[a]?.find((e) => e.periodo === t) ?? {
					periodo: t,
					mexico: null,
					centroamerica: null,
					brecha: null
				}), s = w(a, n), l = r === a, f = T(a), m = s?.brecha == null ? "vacio" : s.brecha > 0 ? "positivo" : s.brecha < 0 ? "negativo" : "cero";
				return /* @__PURE__ */ (0, R.jsxs)("section", {
					className: `wm-brecha-panel${l ? " is-activa" : ""}`,
					"data-testid": `brecha-panel-${a}`,
					children: [/* @__PURE__ */ (0, R.jsxs)("header", {
						className: "wm-brecha-cabeza",
						children: [
							/* @__PURE__ */ (0, R.jsx)("h4", {
								className: "wm-brecha-nombre",
								children: Or[a].nombre
							}),
							/* @__PURE__ */ (0, R.jsx)("span", {
								className: `wm-brecha-valor is-${m}`,
								"data-testid": `brecha-valor-${a}`,
								title: s?.brecha == null ? `Sin comparación para ${n}: falta la tasa de uno de los dos mercados.` : `${Or[a].nombre} en ${n}: México ${k(s.mexico)} − Centroamérica ${k(s.centroamerica)}`,
								children: s?.brecha == null ? "—" : A(s.brecha)
							}),
							/* @__PURE__ */ (0, R.jsx)("span", {
								className: "wm-brecha-cobertura",
								children: f < t.length ? `${f} de ${t.length} trimestres` : "todos los trimestres del rango"
							})
						]
					}), /* @__PURE__ */ (0, R.jsx)("svg", {
						width: c,
						height: kr + Ar.arriba + Ar.abajo,
						role: "group",
						tabIndex: 0,
						"aria-label": `Brecha de ${Or[a].nombre.toLowerCase()} por trimestre, en puntos porcentuales. Seleccionado ${n}: ${s?.brecha == null ? "sin comparación" : A(s.brecha)}. Usa las flechas para recorrer trimestres y Enter para fijarlo.`,
						className: "wm-brecha-svg",
						onPointerMove: O,
						onPointerLeave: () => {
							d(null), p(null);
						},
						onFocus: () => d(n),
						onBlur: () => {
							d(null), p(null);
						},
						onKeyDown: ee,
						onClick: (e) => {
							let t = E(e) ?? u;
							t && i(t);
						},
						children: /* @__PURE__ */ (0, R.jsxs)("g", {
							transform: `translate(${Ar.izquierda},${Ar.arriba})`,
							children: [
								x.map((e) => /* @__PURE__ */ (0, R.jsxs)("g", { children: [/* @__PURE__ */ (0, R.jsx)("line", {
									x1: v(e.inicio) ?? 0,
									x2: v(e.inicio) ?? 0,
									y1: -6,
									y2: kr,
									className: "wm-brecha-guia-anio"
								}), /* @__PURE__ */ (0, R.jsx)("text", {
									x: (v(e.inicio) ?? 0) + 3,
									y: -4,
									className: "wm-brecha-anio",
									children: e.anio
								})] }, `anio-${e.anio}`)),
								C && v(C) !== void 0 ? /* @__PURE__ */ (0, R.jsx)("rect", {
									x: (v(C) ?? 0) - 1,
									y: -6,
									width: v.bandwidth() + 2,
									height: 70,
									className: `wm-brecha-banda${u ? " is-explorada" : ""}`,
									rx: 3
								}) : null,
								/* @__PURE__ */ (0, R.jsx)("line", {
									x1: 0,
									x2: _,
									y1: b(0),
									y2: b(0),
									className: "wm-brecha-cero"
								}),
								/* @__PURE__ */ (0, R.jsx)("text", {
									x: -8,
									y: b(0) + 3,
									textAnchor: "end",
									className: "wm-eje",
									children: "0"
								}),
								/* @__PURE__ */ (0, R.jsxs)("text", {
									x: -8,
									y: b(y) + 4,
									textAnchor: "end",
									className: "wm-eje",
									children: ["+", D(y, 1)]
								}),
								/* @__PURE__ */ (0, R.jsxs)("text", {
									x: -8,
									y: b(-y) + 2,
									textAnchor: "end",
									className: "wm-eje",
									children: ["−", D(y, 1)]
								}),
								/* @__PURE__ */ (0, R.jsx)("g", {
									className: g ? void 0 : "wm-transicion",
									children: o.map((e) => {
										let t = (v(e.periodo) ?? 0) + v.bandwidth() / 2, n = Math.max(3, v.bandwidth() * .7);
										if (e.brecha === null) return null;
										if (e.brecha === 0) return /* @__PURE__ */ (0, R.jsx)("rect", {
											x: t - 5,
											y: b(0) - 1.5,
											width: 10,
											height: 3,
											rx: 1.5,
											className: "wm-brecha-cero-real",
											"aria-hidden": "true"
										}, `cero-${e.periodo}`);
										let r = e.brecha > 0, i = Math.min(b(0), b(e.brecha)), a = Math.max(1.5, Math.abs(b(e.brecha) - b(0)));
										return /* @__PURE__ */ (0, R.jsx)("rect", {
											x: t - n / 2,
											y: i,
											width: n,
											height: a,
											rx: 2,
											fill: r ? S.mexico : S.centroamerica,
											opacity: e.periodo === C ? 1 : .82
										}, `barra-${e.periodo}`);
									})
								}, `${a}-${t.join("|")}`),
								te(a).map(({ p: e, centro: t, ancla: r }) => {
									let i = e === n;
									return /* @__PURE__ */ (0, R.jsx)("text", {
										x: t,
										y: 79,
										textAnchor: r,
										className: `wm-eje${i ? " is-activo" : ""}${e === u && !i ? " is-explorado" : ""}`,
										children: e
									}, `x-${a}-${e}`);
								})
							]
						})
					})]
				}, a);
			}) : null
		}), /* @__PURE__ */ (0, R.jsx)(Er, {
			visible: f !== null && u !== null,
			x: f?.x ?? 0,
			y: f?.y ?? 0,
			testid: "tooltip-brecha",
			ocultarAlDesplazar: m,
			children: u ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
				/* @__PURE__ */ (0, R.jsxs)("p", {
					className: "wm-tooltip-titulo",
					children: [u, " · México − Centroamérica"]
				}),
				Dr.map((e) => {
					let t = w(e, u);
					return /* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-linea",
						children: [/* @__PURE__ */ (0, R.jsx)("span", {
							className: "wm-tooltip-nombre",
							children: Or[e].nombre
						}), t?.brecha == null ? /* @__PURE__ */ (0, R.jsx)("span", {
							className: "wm-tooltip-tenue",
							children: "sin dato"
						}) : /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
							/* @__PURE__ */ (0, R.jsxs)("span", {
								className: "wm-tooltip-tenue",
								children: ["MX ", k(t.mexico)]
							}),
							/* @__PURE__ */ (0, R.jsxs)("span", {
								className: "wm-tooltip-tenue",
								children: ["CA ", k(t.centroamerica)]
							}),
							/* @__PURE__ */ (0, R.jsx)("strong", { children: A(t.brecha) })
						] })]
					}, e);
				}),
				/* @__PURE__ */ (0, R.jsx)("p", {
					className: "wm-tooltip-fuente",
					children: "diferencia en puntos porcentuales · una tasa mayor no implica un importe mayor"
				})
			] }) : null
		})]
	});
}
// src/ui/Calendario.tsx
var Mr = {
	arriba: 22,
	derecha: 132,
	abajo: 34,
	izquierda: 46
}, Nr = 62;
function Pr({ datos: e, mercado: t, onCambiarMercado: n, periodo: r, onSeleccionarPeriodo: i, onSeleccionar: a, hoverPeriodo: o }) {
	let [s, c] = wr(280), [u, d] = (0, l.useState)(null), f = Math.max(160, c - Mr.izquierda - Mr.derecha) / 4, p = Mr.arriba + e.anios.length * Nr + Mr.abajo, m = (0, l.useMemo)(() => {
		let t = e.celdas.map((e) => e.crecimiento).filter((e) => e !== null).map((e) => Math.abs(e));
		return Math.max(1, ...t);
	}, [e]), h = xr().domain([0, e.maximo || 1]).range([0, Math.min(f, Nr) * .44]), g = (e) => {
		if (e.crecimiento === null) return "#E4E8F0";
		if (Math.abs(e.crecimiento) < .05) return "#C9CFDB";
		let t = .22 + .68 * Math.sqrt(Math.abs(e.crecimiento) / m);
		return e.crecimiento > 0 ? `rgba(15, 123, 90, ${t})` : `rgba(180, 67, 63, ${t})`;
	}, _ = (e) => e.crecimiento === null ? "#596273" : "#FFFFFF", v = (e) => {
		e.importe === null ? a({
			titulo: `${x[t] ?? t} · ${e.periodo}`,
			valor: "No publicado",
			unidad: "millones de pesos",
			periodo: e.periodo,
			mercado: t,
			base: "nominal",
			origen: "publicado",
			formula: null,
			fuente: `walmex-${e.periodo.toLowerCase()}`,
			nota: "La empresa no publicó ingresos para este trimestre en la versión vigente; no se estima ni se interpola."
		}) : (i(e.periodo), a({
			titulo: `Ingresos de ${x[t] ?? t} · ${e.periodo}`,
			valor: `${O(e.importe)} M MXN`,
			unidad: "millones de pesos nominales del trimestre",
			periodo: e.periodo,
			mercado: t,
			base: "nominal",
			origen: "publicado",
			formula: e.crecimiento === null ? null : `Variación anual publicada: ${k(e.crecimiento)} frente al mismo trimestre del año anterior`,
			fuente: `walmex-${e.periodo.toLowerCase()}`,
			nota: e.crecimiento === null ? "Hay ingreso publicado, pero no variación anual comparable para este trimestre." : null
		}));
	}, y = (0, l.useMemo)(() => {
		if (!e.maximo) return [];
		let t = [
			e.maximo,
			e.maximo / 2,
			e.maximo / 4
		].map((e) => ({
			valor: e,
			r: h(e)
		})), n = 0;
		return t.map((e) => {
			let t = n + e.r;
			return n += e.r * 2 + 26, {
				...e,
				cx: t
			};
		});
	}, [e.maximo, h]), b = Math.max(12, ...y.map((e) => e.r)) * 2 + 16;
	return /* @__PURE__ */ (0, R.jsxs)(Cr, {
		testid: "bloque-calendario",
		titulo: "Calendario comercial",
		sub: `${x[t] ?? t} · ingreso por trimestre y año · área proporcional al importe`,
		controles: /* @__PURE__ */ (0, R.jsx)("div", {
			className: "wm-segmentado",
			role: "group",
			"aria-label": "Mercado del calendario",
			children: [
				"mexico",
				"centroamerica",
				"consolidado"
			].map((e) => /* @__PURE__ */ (0, R.jsx)("button", {
				type: "button",
				className: `wm-seg${t === e ? " is-activa" : ""}`,
				"aria-pressed": t === e,
				onClick: () => n(e),
				children: x[e]
			}, e))
		}),
		children: [
			/* @__PURE__ */ (0, R.jsx)("div", {
				className: "wm-grafica",
				ref: s,
				"data-testid": "calendario-grafica",
				children: c > 0 ? /* @__PURE__ */ (0, R.jsx)("svg", {
					width: c,
					height: p,
					role: "img",
					"aria-label": `Ingreso por trimestre y año de ${x[t] ?? t}: ${e.celdas.filter((e) => e.importe !== null).map((e) => `${e.periodo} ${O(e.importe)} millones`).join("; ")}.`,
					children: /* @__PURE__ */ (0, R.jsxs)("g", {
						transform: `translate(${Mr.izquierda},${Mr.arriba})`,
						children: [[
							1,
							2,
							3,
							4
						].map((e, t) => /* @__PURE__ */ (0, R.jsxs)("text", {
							x: f * (t + .5),
							y: -8,
							textAnchor: "middle",
							className: `wm-eje${T(r) === e ? " is-activo" : ""}`,
							children: ["T", e]
						}, `col-${e}`)), e.anios.map((t, n) => /* @__PURE__ */ (0, R.jsxs)("g", {
							transform: `translate(0,${n * Nr})`,
							children: [/* @__PURE__ */ (0, R.jsx)("text", {
								x: -12,
								y: 35,
								textAnchor: "end",
								className: "wm-calendario-anio",
								children: t
							}), [
								1,
								2,
								3,
								4
							].map((n, i) => {
								let a = f * (i + .5), s = Nr / 2, l = e.celdas.find((e) => e.anio === t && e.trimestre === n);
								if (!l) return null;
								let u = o === l.periodo, p = r === l.periodo;
								if (l.importe === null) return /* @__PURE__ */ (0, R.jsxs)("g", { children: [/* @__PURE__ */ (0, R.jsx)("circle", {
									cx: a,
									cy: s,
									r: 7,
									fill: "none",
									stroke: "#C3CAD8",
									strokeWidth: 1,
									strokeDasharray: "2 3",
									opacity: .85
								}), /* @__PURE__ */ (0, R.jsx)("title", { children: `${l.periodo}: sin ingreso publicado` })] }, `${t}-${n}`);
								let m = Math.max(3, h(l.importe));
								return /* @__PURE__ */ (0, R.jsxs)("g", {
									onMouseEnter: (e) => d({
										x: e.clientX,
										y: e.clientY,
										celda: l
									}),
									onMouseMove: (e) => d((t) => t ? {
										...t,
										x: e.clientX,
										y: e.clientY
									} : null),
									onMouseLeave: () => d(null),
									children: [
										/* @__PURE__ */ (0, R.jsx)("circle", {
											cx: a,
											cy: s,
											r: Math.max(m + 5, 12),
											fill: "transparent",
											role: "button",
											tabIndex: 0,
											"aria-label": `${l.periodo}: ${O(l.importe)} millones${l.crecimiento === null ? ", sin variación comparable" : `, variación ${k(l.crecimiento)}`}`,
											onFocus: () => d(null),
											onClick: () => v(l),
											onKeyDown: (e) => {
												(e.key === "Enter" || e.key === " ") && (e.preventDefault(), v(l));
											}
										}),
										/* @__PURE__ */ (0, R.jsx)("circle", {
											cx: a,
											cy: s,
											r: m,
											fill: g(l),
											stroke: p ? "#111318" : u ? "#3458F5" : "transparent",
											strokeWidth: p ? 2 : u ? 1.5 : 0,
											pointerEvents: "none"
										}),
										m >= 22 && c >= 520 ? /* @__PURE__ */ (0, R.jsx)("text", {
											x: a,
											y: 34,
											textAnchor: "middle",
											className: "wm-calendario-valor",
											fill: _(l),
											pointerEvents: "none",
											children: O(l.importe)
										}) : null
									]
								}, `${t}-${n}`);
							})]
						}, t))]
					})
				}) : null
			}),
			/* @__PURE__ */ (0, R.jsxs)("div", {
				className: "wm-leyendas-calendario",
				children: [/* @__PURE__ */ (0, R.jsxs)("div", {
					className: "wm-leyenda-tamano",
					"data-testid": "calendario-leyenda-tamano",
					children: [/* @__PURE__ */ (0, R.jsx)("span", {
						className: "wm-tenue",
						children: "Área = ingresos"
					}), /* @__PURE__ */ (0, R.jsx)("svg", {
						width: Math.max(90, y.reduce((e, t) => e + t.r * 2 + 40, 0)),
						height: b,
						role: "img",
						"aria-label": `Escala de área: ${y.map((e) => O(e.valor)).join(", ")} millones de pesos`,
						children: y.map((e) => /* @__PURE__ */ (0, R.jsxs)("g", { children: [/* @__PURE__ */ (0, R.jsx)("circle", {
							cx: e.cx,
							cy: b / 2 - 6,
							r: e.r,
							fill: "none",
							stroke: "#B9C1D0",
							strokeWidth: 1
						}), /* @__PURE__ */ (0, R.jsx)("text", {
							x: e.cx,
							y: b / 2 - 6 + e.r + 11,
							textAnchor: "middle",
							className: "wm-eje",
							children: O(e.valor)
						})] }, e.valor))
					})]
				}), /* @__PURE__ */ (0, R.jsxs)("div", {
					className: "wm-leyenda-color",
					"data-testid": "calendario-leyenda-color",
					children: [
						/* @__PURE__ */ (0, R.jsx)("span", {
							className: "wm-tenue",
							children: "Color = variación anual"
						}),
						/* @__PURE__ */ (0, R.jsx)("span", {
							className: "wm-leyenda-escala-extremo",
							children: k(-m, 0)
						}),
						/* @__PURE__ */ (0, R.jsx)("span", {
							className: "wm-leyenda-escala-banda",
							style: { background: "linear-gradient(90deg, rgba(180,67,63,0.85), rgba(180,67,63,0.18) 46%, rgba(201,207,219,0.9) 50%, rgba(15,123,90,0.18) 54%, rgba(15,123,90,0.85))" },
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ (0, R.jsx)("span", {
							className: "wm-leyenda-escala-extremo",
							children: k(m, 0)
						}),
						/* @__PURE__ */ (0, R.jsxs)("span", {
							className: "wm-leyenda-item",
							children: [/* @__PURE__ */ (0, R.jsx)("span", {
								className: "wm-punto-color",
								style: { background: "#E4E8F0" }
							}), " sin variación"]
						}),
						/* @__PURE__ */ (0, R.jsxs)("span", {
							className: "wm-leyenda-item",
							children: [/* @__PURE__ */ (0, R.jsx)("span", { className: "wm-punto-color is-ausente" }), " sin ingreso"]
						}),
						/* @__PURE__ */ (0, R.jsxs)("span", {
							className: "wm-leyenda-item",
							children: [
								/* @__PURE__ */ (0, R.jsx)("span", {
									className: "wm-punto-color",
									style: { background: C }
								}),
								" aumento ·",
								" ",
								/* @__PURE__ */ (0, R.jsx)("span", {
									className: "wm-punto-color",
									style: { background: w }
								}),
								" caída"
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, R.jsx)(Er, {
				visible: u !== null,
				x: u?.x ?? 0,
				y: u?.y ?? 0,
				testid: "tooltip-calendario",
				children: u ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
					/* @__PURE__ */ (0, R.jsx)("p", {
						className: "wm-tooltip-titulo",
						children: u.celda.periodo
					}),
					/* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-valor",
						children: [O(u.celda.importe), " M MXN"]
					}),
					/* @__PURE__ */ (0, R.jsx)("p", {
						className: "wm-tooltip-linea",
						children: u.celda.crecimiento === null ? "Sin variación anual comparable" : `Variación anual ${k(u.celda.crecimiento)}`
					}),
					/* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-fuente",
						children: ["walmex · ", u.celda.periodo.toLowerCase()]
					})
				] }) : null
			})
		]
	});
}
// src/ui/Contexto.tsx
function Fr({ dato: e, onCerrar: t, onLimpiarMercado: n }) {
	let [r, i] = (0, l.useState)(!1);
	return (0, l.useEffect)(() => {
		i(!1);
	}, [e]), e ? /* @__PURE__ */ (0, R.jsxs)("aside", {
		className: "wm-contexto",
		"aria-live": "polite",
		"data-testid": "panel-contexto",
		children: [
			/* @__PURE__ */ (0, R.jsxs)("div", {
				className: "wm-contexto-cabeza",
				children: [/* @__PURE__ */ (0, R.jsxs)("div", { children: [/* @__PURE__ */ (0, R.jsx)("p", {
					className: "wm-contexto-eyebrow",
					children: e.origen === "publicado" ? "Dato publicado" : "Dato derivado"
				}), /* @__PURE__ */ (0, R.jsx)("h4", { children: e.titulo })] }), /* @__PURE__ */ (0, R.jsx)("button", {
					type: "button",
					className: "wm-btn-ico",
					onClick: t,
					"aria-label": "Cerrar el detalle",
					children: "✕"
				})]
			}),
			/* @__PURE__ */ (0, R.jsxs)("p", {
				className: "wm-contexto-valor",
				children: [
					e.valor,
					" ",
					/* @__PURE__ */ (0, R.jsx)("span", {
						className: "wm-tenue",
						children: e.unidad
					})
				]
			}),
			/* @__PURE__ */ (0, R.jsxs)("div", {
				className: "wm-contexto-resumen",
				children: [
					/* @__PURE__ */ (0, R.jsxs)("span", { children: [
						/* @__PURE__ */ (0, R.jsx)("strong", { children: "Periodo" }),
						" ",
						e.periodo
					] }),
					/* @__PURE__ */ (0, R.jsxs)("span", { children: [
						/* @__PURE__ */ (0, R.jsx)("strong", { children: "Mercado" }),
						" ",
						e.mercado ? x[e.mercado] ?? e.mercado : "Ambos mercados"
					] }),
					/* @__PURE__ */ (0, R.jsxs)("span", { children: [
						/* @__PURE__ */ (0, R.jsx)("strong", { children: "Base" }),
						" ",
						ne(e.base)
					] }),
					e.mercado ? /* @__PURE__ */ (0, R.jsx)("button", {
						type: "button",
						className: "wm-enlace",
						onClick: n,
						children: "quitar resaltado"
					}) : null
				]
			}),
			/* @__PURE__ */ (0, R.jsx)("button", {
				type: "button",
				className: "wm-contexto-mas",
				onClick: () => i((e) => !e),
				"aria-expanded": r,
				"data-testid": "contexto-expandir",
				children: r ? "Ocultar detalle técnico" : "Ver detalle técnico"
			}),
			r ? /* @__PURE__ */ (0, R.jsxs)("dl", {
				className: "wm-contexto-datos",
				children: [
					/* @__PURE__ */ (0, R.jsxs)("div", { children: [/* @__PURE__ */ (0, R.jsx)("dt", { children: "Origen" }), /* @__PURE__ */ (0, R.jsx)("dd", { children: e.origen === "publicado" ? "Publicado por la empresa" : "Cálculo derivado de importes publicados" })] }),
					/* @__PURE__ */ (0, R.jsxs)("div", { children: [/* @__PURE__ */ (0, R.jsx)("dt", { children: "Base de comparación" }), /* @__PURE__ */ (0, R.jsx)("dd", { children: ne(e.base) })] }),
					e.formula ? /* @__PURE__ */ (0, R.jsxs)("div", {
						className: "wm-contexto-ancho",
						children: [/* @__PURE__ */ (0, R.jsx)("dt", { children: "Fórmula" }), /* @__PURE__ */ (0, R.jsx)("dd", {
							className: "wm-mono",
							children: e.formula
						})]
					}) : null,
					/* @__PURE__ */ (0, R.jsxs)("div", {
						className: "wm-contexto-ancho",
						children: [/* @__PURE__ */ (0, R.jsx)("dt", { children: "Documento" }), /* @__PURE__ */ (0, R.jsx)("dd", { children: e.fuente ? `${e.fuente} · estados financieros y comunicado del trimestre` : "sin referencia" })]
					}),
					e.nota ? /* @__PURE__ */ (0, R.jsxs)("div", {
						className: "wm-contexto-ancho",
						children: [/* @__PURE__ */ (0, R.jsx)("dt", { children: "Nota" }), /* @__PURE__ */ (0, R.jsx)("dd", { children: e.nota })]
					}) : null
				]
			}) : null
		]
	}) : null;
}
// src/ui/Contribuciones.tsx
var Ir = 252, Lr = {
	arriba: 22,
	derecha: 14,
	abajo: 34,
	izquierda: 46
};
function Rr({ columnas: e, periodo: t, onSeleccionarPeriodo: n, onSeleccionar: r }) {
	let [i, a] = wr(280), [o, s] = (0, l.useState)(null), c = Math.max(120, a - Lr.izquierda - Lr.derecha), u = $n().domain(e.map((e) => e.periodo)).range([0, c]).padding(.34), { maximo: d, minimo: f } = (0, l.useMemo)(() => {
		let t = .6, n = -.6;
		for (let r of e) {
			let e = Math.max(0, r.aporteMexico) + Math.max(0, r.aporteCentroamerica) + Math.max(0, r.residual), i = Math.min(0, r.aporteMexico) + Math.min(0, r.aporteCentroamerica) + Math.min(0, r.residual);
			t = Math.max(t, e, r.crecimientoCalculado), n = Math.min(n, i, r.crecimientoCalculado);
		}
		return {
			maximo: t * 1.12,
			minimo: n * 1.12
		};
	}, [e]), p = hr().domain([f, d]).range([Ir, 0]), m = Math.max(1, Math.ceil(e.length / (a < 480 ? 4 : 8))), h = e.findIndex((e) => e.periodo === t), g = (e) => e === h ? !0 : Math.abs(e - h) <= 1 ? !1 : e % m === 0, _ = (e) => {
		n(e.periodo), r({
			titulo: `Aportación al crecimiento · ${e.periodo}`,
			valor: `${D(e.aporteMexico, 2)} pp México · ${D(e.aporteCentroamerica, 2)} pp Centroamérica`,
			unidad: "puntos porcentuales del crecimiento consolidado",
			periodo: e.periodo,
			mercado: null,
			base: "nominal_publicado",
			origen: "derivado",
			formula: `México: (ingreso ${e.periodo} − ingreso ${e.anterior}) ÷ ingreso consolidado ${e.anterior} × 100; Centroamérica con el mismo denominador. Crecimiento calculado del consolidado: ${D(e.crecimientoCalculado, 2)} pp; publicado: ${k(e.crecimientoPublicado)}; residual: ${D(e.residual, 2)} pp.`,
			fuente: `walmex-${e.periodo.toLowerCase()}`,
			nota: "Cada contribución usa el ingreso consolidado del mismo trimestre del año anterior como denominador; no son tasas de crecimiento de cada mercado."
		});
	};
	return /* @__PURE__ */ (0, R.jsxs)(Cr, {
		testid: "bloque-contribuciones",
		protagonista: !0,
		titulo: "Aportación al crecimiento",
		sub: `Contribución de cada mercado al crecimiento consolidado · ${e.length} trimestres calculables`,
		controles: /* @__PURE__ */ (0, R.jsxs)("ul", {
			className: "wm-leyenda wm-leyenda--compacta",
			children: [
				/* @__PURE__ */ (0, R.jsxs)("li", { children: [/* @__PURE__ */ (0, R.jsx)("span", {
					className: "wm-punto-color",
					style: { background: S.mexico }
				}), " México"] }),
				/* @__PURE__ */ (0, R.jsxs)("li", { children: [
					/* @__PURE__ */ (0, R.jsx)("span", {
						className: "wm-punto-color",
						style: { background: S.centroamerica }
					}),
					" ",
					"Centroamérica"
				] }),
				/* @__PURE__ */ (0, R.jsxs)("li", { children: [/* @__PURE__ */ (0, R.jsx)("span", {
					className: "wm-punto-color",
					style: { background: "#8A93A5" }
				}), " residual"] }),
				/* @__PURE__ */ (0, R.jsxs)("li", { children: [/* @__PURE__ */ (0, R.jsx)("span", {
					className: "wm-punto-color",
					style: { background: "#111318" }
				}), " crecimiento calculado"] })
			]
		}),
		children: [/* @__PURE__ */ (0, R.jsx)("div", {
			className: "wm-grafica",
			ref: i,
			"data-testid": "contribuciones-grafica",
			children: a > 0 && e.length ? /* @__PURE__ */ (0, R.jsx)("svg", {
				width: a,
				height: Ir + Lr.arriba + Lr.abajo,
				role: "img",
				"aria-label": `Contribuciones al crecimiento consolidado en puntos porcentuales: ${e.map((e) => `${e.periodo} México ${D(e.aporteMexico, 2)} y Centroamérica ${D(e.aporteCentroamerica, 2)}, crecimiento calculado ${D(e.crecimientoCalculado, 2)}`).join("; ")}.`,
				children: /* @__PURE__ */ (0, R.jsxs)("g", {
					transform: `translate(${Lr.izquierda},${Lr.arriba})`,
					children: [
						/* @__PURE__ */ (0, R.jsx)("line", {
							x1: 0,
							x2: c,
							y1: p(0),
							y2: p(0),
							className: "wm-cero-fuerte"
						}),
						(() => {
							let e = /* @__PURE__ */ new Set([0]);
							for (let t of p.ticks(5)) e.add(t);
							return f < 0 && e.add(-Math.max(1, Math.round(Math.abs(f) / 2))), d > 0 && e.add(Math.round(d / 2)), [...e].sort((e, t) => t - e);
						})().map((e) => /* @__PURE__ */ (0, R.jsxs)("g", { children: [/* @__PURE__ */ (0, R.jsx)("line", {
							x1: 0,
							x2: c,
							y1: p(e),
							y2: p(e),
							className: "wm-rejilla"
						}), /* @__PURE__ */ (0, R.jsx)("text", {
							x: -10,
							y: p(e) + 3,
							textAnchor: "end",
							className: "wm-eje",
							children: D(e, 1)
						})] }, `eje-${e}`)),
						/* @__PURE__ */ (0, R.jsx)("text", {
							x: -10,
							y: -6,
							textAnchor: "end",
							className: "wm-eje-sutil",
							children: "pp"
						}),
						e.map((e, n) => {
							let r = u(e.periodo) ?? 0, i = u.bandwidth(), a = [
								{
									clave: "mexico",
									valor: e.aporteMexico,
									color: S.mexico
								},
								{
									clave: "centroamerica",
									valor: e.aporteCentroamerica,
									color: S.centroamerica
								},
								{
									clave: "residual",
									valor: e.residual,
									color: "#8A93A5"
								}
							], o = 0, c = 0, l = e.periodo === t;
							return /* @__PURE__ */ (0, R.jsxs)("g", {
								onMouseEnter: (t) => s({
									x: t.clientX,
									y: t.clientY,
									columna: e
								}),
								onMouseMove: (e) => s((t) => t ? {
									...t,
									x: e.clientX,
									y: e.clientY
								} : null),
								onMouseLeave: () => s(null),
								children: [
									l ? /* @__PURE__ */ (0, R.jsx)("line", {
										x1: r - 4,
										x2: r + i + 4,
										y1: 256,
										y2: 256,
										stroke: "#3458F5",
										strokeWidth: 2,
										strokeLinecap: "round"
									}) : null,
									a.map((t) => {
										if (Math.abs(t.valor) < .005) return null;
										let n = t.valor > 0, a = n ? o : c, s = a + t.valor;
										n ? o = s : c = s;
										let l = Math.max(1, Math.abs(p(a) - p(s))), u = Math.min(p(a), p(s));
										return /* @__PURE__ */ (0, R.jsx)("rect", {
											x: r,
											y: u,
											width: i,
											height: l,
											fill: t.color,
											opacity: .92,
											role: "button",
											tabIndex: 0,
											"aria-label": `${e.periodo} ${t.clave}: ${D(t.valor, 2)} puntos porcentuales`,
											onClick: () => _(e),
											onKeyDown: (t) => {
												(t.key === "Enter" || t.key === " ") && (t.preventDefault(), _(e));
											}
										}, t.clave);
									}),
									/* @__PURE__ */ (0, R.jsx)("g", { children: /* @__PURE__ */ (0, R.jsx)("line", {
										x1: r - 3,
										x2: r + i + 3,
										y1: p(e.crecimientoCalculado),
										y2: p(e.crecimientoCalculado),
										stroke: "#111318",
										strokeWidth: 2
									}) }),
									g(n) ? /* @__PURE__ */ (0, R.jsx)("text", {
										x: r + i / 2,
										y: 268,
										textAnchor: "middle",
										className: `wm-eje${l ? " is-activo" : ""}`,
										children: e.periodo
									}) : null
								]
							}, e.periodo);
						})
					]
				})
			}) : /* @__PURE__ */ (0, R.jsx)("p", {
				className: "wm-vacio",
				children: "Sin trimestres comparables en el rango seleccionado."
			})
		}), /* @__PURE__ */ (0, R.jsx)(Er, {
			visible: o !== null,
			x: o?.x ?? 0,
			y: o?.y ?? 0,
			testid: "tooltip-contribuciones",
			children: o ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
				/* @__PURE__ */ (0, R.jsx)("p", {
					className: "wm-tooltip-titulo",
					children: o.columna.periodo
				}),
				/* @__PURE__ */ (0, R.jsxs)("p", {
					className: "wm-tooltip-linea",
					children: [
						/* @__PURE__ */ (0, R.jsx)("span", {
							className: "wm-punto-color",
							style: { background: S.mexico }
						}),
						" México",
						" ",
						/* @__PURE__ */ (0, R.jsxs)("strong", { children: [D(o.columna.aporteMexico, 2), " pp"] })
					]
				}),
				/* @__PURE__ */ (0, R.jsxs)("p", {
					className: "wm-tooltip-linea",
					children: [
						/* @__PURE__ */ (0, R.jsx)("span", {
							className: "wm-punto-color",
							style: { background: S.centroamerica }
						}),
						" ",
						"Centroamérica ",
						/* @__PURE__ */ (0, R.jsxs)("strong", { children: [D(o.columna.aporteCentroamerica, 2), " pp"] })
					]
				}),
				/* @__PURE__ */ (0, R.jsxs)("p", {
					className: "wm-tooltip-linea",
					children: [
						"Crecimiento calculado",
						" ",
						/* @__PURE__ */ (0, R.jsxs)("strong", { children: [D(o.columna.crecimientoCalculado, 2), " pp"] })
					]
				}),
				/* @__PURE__ */ (0, R.jsxs)("p", {
					className: "wm-tooltip-linea",
					children: [
						"Publicado ",
						k(o.columna.crecimientoPublicado),
						" · residual",
						" ",
						D(o.columna.residual, 2),
						" pp"
					]
				})
			] }) : null
		})]
	});
}
// node_modules/d3-path/dist/d3-path.mjs
var zr = Math.PI, Br = 2 * zr, Vr = 1e-6, Hr = Br - Vr;
function Ur(e) {
	this._ += e[0];
	for (let t = 1, n = e.length; t < n; ++t) this._ += arguments[t] + e[t];
}
function Wr(e) {
	let t = Math.floor(e);
	if (!(t >= 0)) throw Error(`invalid digits: ${e}`);
	if (t > 15) return Ur;
	let n = 10 ** t;
	return function(e) {
		this._ += e[0];
		for (let t = 1, r = e.length; t < r; ++t) this._ += Math.round(arguments[t] * n) / n + e[t];
	};
}
function Gr(e, t, n, r) {
	return e === n && t === r;
}
function Kr(e) {
	let t = Math.floor(e);
	if (!(t <= 15)) return Gr;
	let n = 10 ** t, r = function(e) {
		return Math.round(e * n);
	};
	return function(e, t, n, i) {
		return r(e) === r(n) && r(t) === r(i);
	};
}
var qr = class {
	constructor(e) {
		this._x0 = this._y0 = this._x1 = this._y1 = null, this._ = "", this._append = e == null ? Ur : Wr(e), this._equal = e == null ? Gr : Kr(e);
	}
	moveTo(e, t) {
		this._append`M${this._x0 = this._x1 = +e},${this._y0 = this._y1 = +t}`;
	}
	closePath() {
		this._x1 !== null && (this._x1 = this._x0, this._y1 = this._y0, this._append`Z`);
	}
	lineTo(e, t) {
		this._append`L${this._x1 = +e},${this._y1 = +t}`;
	}
	quadraticCurveTo(e, t, n, r) {
		this._append`Q${+e},${+t},${this._x1 = +n},${this._y1 = +r}`;
	}
	bezierCurveTo(e, t, n, r, i, a) {
		this._append`C${+e},${+t},${+n},${+r},${this._x1 = +i},${this._y1 = +a}`;
	}
	arcTo(e, t, n, r, i) {
		if (e = +e, t = +t, n = +n, r = +r, i = +i, i < 0) throw Error(`negative radius: ${i}`);
		let a = this._x1, o = this._y1, s = n - e, c = r - t, l = a - e, u = o - t, d = l * l + u * u;
		if (this._x1 === null) this._append`M${this._x1 = e},${this._y1 = t}`;
		else if (d > Vr) {
			if (!(Math.abs(u * s - c * l) > Vr) || !i) this._append`L${this._x1 = e},${this._y1 = t}`;
			else {
				let f = n - a, p = r - o, m = s * s + c * c, h = f * f + p * p, g = Math.sqrt(m), _ = Math.sqrt(d), v = i * Math.tan((zr - Math.acos((m + d - h) / (2 * g * _))) / 2), y = v / _, b = v / g;
				Math.abs(y - 1) > Vr && this._append`L${e + y * l},${t + y * u}`, this._append`A${i},${i},0,0,${+(u * f > l * p)},${this._x1 = e + b * s},${this._y1 = t + b * c}`;
			}
		}
	}
	arc(e, t, n, r, i, a) {
		if (e = +e, t = +t, n = +n, a = !!a, n < 0) throw Error(`negative radius: ${n}`);
		let o = n * Math.cos(r), s = n * Math.sin(r), c = e + o, l = t + s, u = 1 ^ a, d = a ? r - i : i - r;
		if (this._x1 === null ? this._append`M${c},${l}` : (Math.abs(this._x1 - c) > Vr || Math.abs(this._y1 - l) > Vr) && this._append`L${c},${l}`, n) {
			if (d < 0 && (d = d % Br + Br), d > Hr) this._append`A${n},${n},0,1,${u},${e - o},${t - s}A${n},${n},0,1,${u},${this._x1 = c},${this._y1 = l}`;
			else if (d > Vr) {
				let a = e + n * Math.cos(i), o = t + n * Math.sin(i);
				if (d >= zr && this._equal(c, l, a, o)) {
					d /= 2;
					let i = r + d;
					this._append`A${n},${n},0,${+(d >= zr)},${u},${e + n * Math.cos(i)},${t + n * Math.sin(i)}`;
				}
				this._append`A${n},${n},0,${+(d >= zr)},${u},${this._x1 = a},${this._y1 = o}`;
			}
		}
	}
	rect(e, t, n, r) {
		this._append`M${this._x0 = this._x1 = +e},${this._y0 = this._y1 = +t}h${n = +n}v${+r}h${-n}Z`;
	}
	toString() {
		return this._;
	}
};
qr.prototype;
// node_modules/d3-shape/dist/d3-shape.mjs
function Jr(e) {
	return function() {
		return e;
	};
}
var Yr = Math.cos, Xr = Math.sin, Zr = Math.sqrt, Qr = 1e-12, $r = Math.PI;
$r / 2;
var ei = 2 * $r;
function ti(e) {
	let t = 3;
	return e.digits = function(n) {
		if (!arguments.length) return t;
		if (n == null) t = null;
		else {
			let e = Math.floor(n);
			if (!(e >= 0)) throw RangeError(`invalid digits: ${n}`);
			t = e;
		}
		return e;
	}, () => new qr(t);
}
Array.prototype.slice;
function ni(e) {
	return typeof e == "object" && "length" in e ? e : Array.from(e);
}
function ri(e) {
	this._context = e;
}
ri.prototype = {
	areaStart: function() {
		this._line = 0;
	},
	areaEnd: function() {
		this._line = NaN;
	},
	lineStart: function() {
		this._point = 0;
	},
	lineEnd: function() {
		(this._line || this._line !== 0 && this._point === 1) && this._context.closePath(), this._line = 1 - this._line;
	},
	point: function(e, t) {
		switch (e = +e, t = +t, this._point) {
			case 0:
				this._point = 1, this._line ? this._context.lineTo(e, t) : this._context.moveTo(e, t);
				break;
			case 1: this._point = 2;
			default: this._context.lineTo(e, t);
		}
	}
};
function ii(e) {
	return new ri(e);
}
function ai(e) {
	return e[0];
}
function oi(e) {
	return e[1];
}
function si(e, t) {
	var n = Jr(!0), r = null, i = ii, a = null, o = ti(s);
	e = typeof e == "function" ? e : e === void 0 ? ai : Jr(e), t = typeof t == "function" ? t : t === void 0 ? oi : Jr(t);
	function s(s) {
		var c, l = (s = ni(s)).length, u, d = !1, f;
		for (r ?? (a = i(f = o())), c = 0; c <= l; ++c) !(c < l && n(u = s[c], c, s)) === d && ((d = !d) ? a.lineStart() : a.lineEnd()), d && a.point(+e(u, c, s), +t(u, c, s));
		if (f) return a = null, f + "" || null;
	}
	return s.x = function(t) {
		return arguments.length ? (e = typeof t == "function" ? t : Jr(+t), s) : e;
	}, s.y = function(e) {
		return arguments.length ? (t = typeof e == "function" ? e : Jr(+e), s) : t;
	}, s.defined = function(e) {
		return arguments.length ? (n = typeof e == "function" ? e : Jr(!!e), s) : n;
	}, s.curve = function(e) {
		return arguments.length ? (i = e, r != null && (a = i(r)), s) : i;
	}, s.context = function(e) {
		return arguments.length ? (e == null ? r = a = null : a = i(r = e), s) : r;
	}, s;
}
function ci(e, t, n) {
	var r = null, i = Jr(!0), a = null, o = ii, s = null, c = ti(l);
	e = typeof e == "function" ? e : e === void 0 ? ai : Jr(+e), t = typeof t == "function" ? t : Jr(t === void 0 ? 0 : +t), n = typeof n == "function" ? n : n === void 0 ? oi : Jr(+n);
	function l(l) {
		var u, d, f, p = (l = ni(l)).length, m, h = !1, g, _ = Array(p), v = Array(p);
		for (a ?? (s = o(g = c())), u = 0; u <= p; ++u) {
			if (!(u < p && i(m = l[u], u, l)) === h) {
				if (h = !h) d = u, s.areaStart(), s.lineStart();
				else {
					for (s.lineEnd(), s.lineStart(), f = u - 1; f >= d; --f) s.point(_[f], v[f]);
					s.lineEnd(), s.areaEnd();
				}
			}
			h && (_[u] = +e(m, u, l), v[u] = +t(m, u, l), s.point(r ? +r(m, u, l) : _[u], n ? +n(m, u, l) : v[u]));
		}
		if (g) return s = null, g + "" || null;
	}
	function u() {
		return si().defined(i).curve(o).context(a);
	}
	return l.x = function(t) {
		return arguments.length ? (e = typeof t == "function" ? t : Jr(+t), r = null, l) : e;
	}, l.x0 = function(t) {
		return arguments.length ? (e = typeof t == "function" ? t : Jr(+t), l) : e;
	}, l.x1 = function(e) {
		return arguments.length ? (r = e == null ? null : typeof e == "function" ? e : Jr(+e), l) : r;
	}, l.y = function(e) {
		return arguments.length ? (t = typeof e == "function" ? e : Jr(+e), n = null, l) : t;
	}, l.y0 = function(e) {
		return arguments.length ? (t = typeof e == "function" ? e : Jr(+e), l) : t;
	}, l.y1 = function(e) {
		return arguments.length ? (n = e == null ? null : typeof e == "function" ? e : Jr(+e), l) : n;
	}, l.lineX0 = l.lineY0 = function() {
		return u().x(e).y(t);
	}, l.lineY1 = function() {
		return u().x(e).y(n);
	}, l.lineX1 = function() {
		return u().x(r).y(t);
	}, l.defined = function(e) {
		return arguments.length ? (i = typeof e == "function" ? e : Jr(!!e), l) : i;
	}, l.curve = function(e) {
		return arguments.length ? (o = e, a != null && (s = o(a)), l) : o;
	}, l.context = function(e) {
		return arguments.length ? (e == null ? a = s = null : s = o(a = e), l) : a;
	}, l;
}
ui(ii);
function li(e) {
	this._curve = e;
}
li.prototype = {
	areaStart: function() {
		this._curve.areaStart();
	},
	areaEnd: function() {
		this._curve.areaEnd();
	},
	lineStart: function() {
		this._curve.lineStart();
	},
	lineEnd: function() {
		this._curve.lineEnd();
	},
	point: function(e, t) {
		this._curve.point(t * Math.sin(e), t * -Math.cos(e));
	}
};
function ui(e) {
	function t(t) {
		return new li(e(t));
	}
	return t._curve = e, t;
}
Zr(3), Zr(1 / 3) * 2;
var di = Xr($r / 10) / Xr(7 * $r / 10);
Xr(ei / 10) * di, -Yr(ei / 10) * di, Zr(3), Zr(3), Zr(3) / 2, (1 / Zr(12) / 2 + 1) * 3;
function fi() {}
function pi(e, t, n) {
	e._context.bezierCurveTo((2 * e._x0 + e._x1) / 3, (2 * e._y0 + e._y1) / 3, (e._x0 + 2 * e._x1) / 3, (e._y0 + 2 * e._y1) / 3, (e._x0 + 4 * e._x1 + t) / 6, (e._y0 + 4 * e._y1 + n) / 6);
}
function mi(e) {
	this._context = e;
}
mi.prototype = {
	areaStart: function() {
		this._line = 0;
	},
	areaEnd: function() {
		this._line = NaN;
	},
	lineStart: function() {
		this._x0 = this._x1 = this._y0 = this._y1 = NaN, this._point = 0;
	},
	lineEnd: function() {
		switch (this._point) {
			case 3: pi(this, this._x1, this._y1);
			case 2: this._context.lineTo(this._x1, this._y1);
		}
		(this._line || this._line !== 0 && this._point === 1) && this._context.closePath(), this._line = 1 - this._line;
	},
	point: function(e, t) {
		switch (e = +e, t = +t, this._point) {
			case 0:
				this._point = 1, this._line ? this._context.lineTo(e, t) : this._context.moveTo(e, t);
				break;
			case 1:
				this._point = 2;
				break;
			case 2: this._point = 3, this._context.lineTo((5 * this._x0 + this._x1) / 6, (5 * this._y0 + this._y1) / 6);
			default: pi(this, e, t);
		}
		this._x0 = this._x1, this._x1 = e, this._y0 = this._y1, this._y1 = t;
	}
};
function hi(e, t) {
	this._basis = new mi(e), this._beta = t;
}
hi.prototype = {
	lineStart: function() {
		this._x = [], this._y = [], this._basis.lineStart();
	},
	lineEnd: function() {
		var e = this._x, t = this._y, n = e.length - 1;
		if (n > 0) for (var r = e[0], i = t[0], a = e[n] - r, o = t[n] - i, s = -1, c; ++s <= n;) c = s / n, this._basis.point(this._beta * e[s] + (1 - this._beta) * (r + c * a), this._beta * t[s] + (1 - this._beta) * (i + c * o));
		this._x = this._y = null, this._basis.lineEnd();
	},
	point: function(e, t) {
		this._x.push(+e), this._y.push(+t);
	}
}, (function e(t) {
	function n(e) {
		return t === 1 ? new mi(e) : new hi(e, t);
	}
	return n.beta = function(t) {
		return e(+t);
	}, n;
})(.85);
function gi(e, t, n) {
	e._context.bezierCurveTo(e._x1 + e._k * (e._x2 - e._x0), e._y1 + e._k * (e._y2 - e._y0), e._x2 + e._k * (e._x1 - t), e._y2 + e._k * (e._y1 - n), e._x2, e._y2);
}
function _i(e, t) {
	this._context = e, this._k = (1 - t) / 6;
}
_i.prototype = {
	areaStart: function() {
		this._line = 0;
	},
	areaEnd: function() {
		this._line = NaN;
	},
	lineStart: function() {
		this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN, this._point = 0;
	},
	lineEnd: function() {
		switch (this._point) {
			case 2:
				this._context.lineTo(this._x2, this._y2);
				break;
			case 3: gi(this, this._x1, this._y1);
		}
		(this._line || this._line !== 0 && this._point === 1) && this._context.closePath(), this._line = 1 - this._line;
	},
	point: function(e, t) {
		switch (e = +e, t = +t, this._point) {
			case 0:
				this._point = 1, this._line ? this._context.lineTo(e, t) : this._context.moveTo(e, t);
				break;
			case 1:
				this._point = 2, this._x1 = e, this._y1 = t;
				break;
			case 2: this._point = 3;
			default: gi(this, e, t);
		}
		this._x0 = this._x1, this._x1 = this._x2, this._x2 = e, this._y0 = this._y1, this._y1 = this._y2, this._y2 = t;
	}
}, (function e(t) {
	function n(e) {
		return new _i(e, t);
	}
	return n.tension = function(t) {
		return e(+t);
	}, n;
})(0);
function vi(e, t) {
	this._context = e, this._k = (1 - t) / 6;
}
vi.prototype = {
	areaStart: fi,
	areaEnd: fi,
	lineStart: function() {
		this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 = this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN, this._point = 0;
	},
	lineEnd: function() {
		switch (this._point) {
			case 1:
				this._context.moveTo(this._x3, this._y3), this._context.closePath();
				break;
			case 2:
				this._context.lineTo(this._x3, this._y3), this._context.closePath();
				break;
			case 3: this.point(this._x3, this._y3), this.point(this._x4, this._y4), this.point(this._x5, this._y5);
		}
	},
	point: function(e, t) {
		switch (e = +e, t = +t, this._point) {
			case 0:
				this._point = 1, this._x3 = e, this._y3 = t;
				break;
			case 1:
				this._point = 2, this._context.moveTo(this._x4 = e, this._y4 = t);
				break;
			case 2:
				this._point = 3, this._x5 = e, this._y5 = t;
				break;
			default: gi(this, e, t);
		}
		this._x0 = this._x1, this._x1 = this._x2, this._x2 = e, this._y0 = this._y1, this._y1 = this._y2, this._y2 = t;
	}
}, (function e(t) {
	function n(e) {
		return new vi(e, t);
	}
	return n.tension = function(t) {
		return e(+t);
	}, n;
})(0);
function yi(e, t) {
	this._context = e, this._k = (1 - t) / 6;
}
yi.prototype = {
	areaStart: function() {
		this._line = 0;
	},
	areaEnd: function() {
		this._line = NaN;
	},
	lineStart: function() {
		this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN, this._point = 0;
	},
	lineEnd: function() {
		(this._line || this._line !== 0 && this._point === 3) && this._context.closePath(), this._line = 1 - this._line;
	},
	point: function(e, t) {
		switch (e = +e, t = +t, this._point) {
			case 0:
				this._point = 1;
				break;
			case 1:
				this._point = 2;
				break;
			case 2:
				this._point = 3, this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2);
				break;
			case 3: this._point = 4;
			default: gi(this, e, t);
		}
		this._x0 = this._x1, this._x1 = this._x2, this._x2 = e, this._y0 = this._y1, this._y1 = this._y2, this._y2 = t;
	}
}, (function e(t) {
	function n(e) {
		return new yi(e, t);
	}
	return n.tension = function(t) {
		return e(+t);
	}, n;
})(0);
function bi(e, t, n) {
	var r = e._x1, i = e._y1, a = e._x2, o = e._y2;
	if (e._l01_a > Qr) {
		var s = 2 * e._l01_2a + 3 * e._l01_a * e._l12_a + e._l12_2a, c = 3 * e._l01_a * (e._l01_a + e._l12_a);
		r = (r * s - e._x0 * e._l12_2a + e._x2 * e._l01_2a) / c, i = (i * s - e._y0 * e._l12_2a + e._y2 * e._l01_2a) / c;
	}
	if (e._l23_a > Qr) {
		var l = 2 * e._l23_2a + 3 * e._l23_a * e._l12_a + e._l12_2a, u = 3 * e._l23_a * (e._l23_a + e._l12_a);
		a = (a * l + e._x1 * e._l23_2a - t * e._l12_2a) / u, o = (o * l + e._y1 * e._l23_2a - n * e._l12_2a) / u;
	}
	e._context.bezierCurveTo(r, i, a, o, e._x2, e._y2);
}
function xi(e, t) {
	this._context = e, this._alpha = t;
}
xi.prototype = {
	areaStart: function() {
		this._line = 0;
	},
	areaEnd: function() {
		this._line = NaN;
	},
	lineStart: function() {
		this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN, this._l01_a = this._l12_a = this._l23_a = this._l01_2a = this._l12_2a = this._l23_2a = this._point = 0;
	},
	lineEnd: function() {
		switch (this._point) {
			case 2:
				this._context.lineTo(this._x2, this._y2);
				break;
			case 3: this.point(this._x2, this._y2);
		}
		(this._line || this._line !== 0 && this._point === 1) && this._context.closePath(), this._line = 1 - this._line;
	},
	point: function(e, t) {
		if (e = +e, t = +t, this._point) {
			var n = this._x2 - e, r = this._y2 - t;
			this._l23_a = Math.sqrt(this._l23_2a = (n * n + r * r) ** +this._alpha);
		}
		switch (this._point) {
			case 0:
				this._point = 1, this._line ? this._context.lineTo(e, t) : this._context.moveTo(e, t);
				break;
			case 1:
				this._point = 2;
				break;
			case 2: this._point = 3;
			default: bi(this, e, t);
		}
		this._l01_a = this._l12_a, this._l12_a = this._l23_a, this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a, this._x0 = this._x1, this._x1 = this._x2, this._x2 = e, this._y0 = this._y1, this._y1 = this._y2, this._y2 = t;
	}
}, (function e(t) {
	function n(e) {
		return t ? new xi(e, t) : new _i(e, 0);
	}
	return n.alpha = function(t) {
		return e(+t);
	}, n;
})(.5);
function Si(e, t) {
	this._context = e, this._alpha = t;
}
Si.prototype = {
	areaStart: fi,
	areaEnd: fi,
	lineStart: function() {
		this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 = this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN, this._l01_a = this._l12_a = this._l23_a = this._l01_2a = this._l12_2a = this._l23_2a = this._point = 0;
	},
	lineEnd: function() {
		switch (this._point) {
			case 1:
				this._context.moveTo(this._x3, this._y3), this._context.closePath();
				break;
			case 2:
				this._context.lineTo(this._x3, this._y3), this._context.closePath();
				break;
			case 3: this.point(this._x3, this._y3), this.point(this._x4, this._y4), this.point(this._x5, this._y5);
		}
	},
	point: function(e, t) {
		if (e = +e, t = +t, this._point) {
			var n = this._x2 - e, r = this._y2 - t;
			this._l23_a = Math.sqrt(this._l23_2a = (n * n + r * r) ** +this._alpha);
		}
		switch (this._point) {
			case 0:
				this._point = 1, this._x3 = e, this._y3 = t;
				break;
			case 1:
				this._point = 2, this._context.moveTo(this._x4 = e, this._y4 = t);
				break;
			case 2:
				this._point = 3, this._x5 = e, this._y5 = t;
				break;
			default: bi(this, e, t);
		}
		this._l01_a = this._l12_a, this._l12_a = this._l23_a, this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a, this._x0 = this._x1, this._x1 = this._x2, this._x2 = e, this._y0 = this._y1, this._y1 = this._y2, this._y2 = t;
	}
}, (function e(t) {
	function n(e) {
		return t ? new Si(e, t) : new vi(e, 0);
	}
	return n.alpha = function(t) {
		return e(+t);
	}, n;
})(.5);
function Ci(e, t) {
	this._context = e, this._alpha = t;
}
Ci.prototype = {
	areaStart: function() {
		this._line = 0;
	},
	areaEnd: function() {
		this._line = NaN;
	},
	lineStart: function() {
		this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN, this._l01_a = this._l12_a = this._l23_a = this._l01_2a = this._l12_2a = this._l23_2a = this._point = 0;
	},
	lineEnd: function() {
		(this._line || this._line !== 0 && this._point === 3) && this._context.closePath(), this._line = 1 - this._line;
	},
	point: function(e, t) {
		if (e = +e, t = +t, this._point) {
			var n = this._x2 - e, r = this._y2 - t;
			this._l23_a = Math.sqrt(this._l23_2a = (n * n + r * r) ** +this._alpha);
		}
		switch (this._point) {
			case 0:
				this._point = 1;
				break;
			case 1:
				this._point = 2;
				break;
			case 2:
				this._point = 3, this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2);
				break;
			case 3: this._point = 4;
			default: bi(this, e, t);
		}
		this._l01_a = this._l12_a, this._l12_a = this._l23_a, this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a, this._x0 = this._x1, this._x1 = this._x2, this._x2 = e, this._y0 = this._y1, this._y1 = this._y2, this._y2 = t;
	}
}, (function e(t) {
	function n(e) {
		return t ? new Ci(e, t) : new yi(e, 0);
	}
	return n.alpha = function(t) {
		return e(+t);
	}, n;
})(.5);
function wi(e) {
	return e < 0 ? -1 : 1;
}
function Ti(e, t, n) {
	var r = e._x1 - e._x0, i = t - e._x1, a = (e._y1 - e._y0) / (r || i < 0 && -0), o = (n - e._y1) / (i || r < 0 && -0), s = (a * i + o * r) / (r + i);
	return (wi(a) + wi(o)) * Math.min(Math.abs(a), Math.abs(o), .5 * Math.abs(s)) || 0;
}
function Ei(e, t) {
	var n = e._x1 - e._x0;
	return n ? (3 * (e._y1 - e._y0) / n - t) / 2 : t;
}
function Di(e, t, n) {
	var r = e._x0, i = e._y0, a = e._x1, o = e._y1, s = (a - r) / 3;
	e._context.bezierCurveTo(r + s, i + s * t, a - s, o - s * n, a, o);
}
function Oi(e) {
	this._context = e;
}
Oi.prototype = {
	areaStart: function() {
		this._line = 0;
	},
	areaEnd: function() {
		this._line = NaN;
	},
	lineStart: function() {
		this._x0 = this._x1 = this._y0 = this._y1 = this._t0 = NaN, this._point = 0;
	},
	lineEnd: function() {
		switch (this._point) {
			case 2:
				this._context.lineTo(this._x1, this._y1);
				break;
			case 3: Di(this, this._t0, Ei(this, this._t0));
		}
		(this._line || this._line !== 0 && this._point === 1) && this._context.closePath(), this._line = 1 - this._line;
	},
	point: function(e, t) {
		var n = NaN;
		if (e = +e, t = +t, e !== this._x1 || t !== this._y1) {
			switch (this._point) {
				case 0:
					this._point = 1, this._line ? this._context.lineTo(e, t) : this._context.moveTo(e, t);
					break;
				case 1:
					this._point = 2;
					break;
				case 2:
					this._point = 3, Di(this, Ei(this, n = Ti(this, e, t)), n);
					break;
				default: Di(this, this._t0, n = Ti(this, e, t));
			}
			this._x0 = this._x1, this._x1 = e, this._y0 = this._y1, this._y1 = t, this._t0 = n;
		}
	}
}, Object.create(Oi.prototype).point = function(e, t) {
	Oi.prototype.point.call(this, t, e);
};
// src/ui/Indice.tsx
var ki = 256, Ai = {
	arriba: 20,
	derecha: 64,
	abajo: 54,
	izquierda: 44
};
function ji({ series: e, periodos: t, todos: n, base: r, onCambiarBase: i, onSeleccionarPeriodo: a, onSeleccionar: o, seleccionado: s }) {
	let [c, u] = wr(280), [d, f] = (0, l.useState)(null), [p, m] = (0, l.useState)(null), h = Tr(), g = (0, l.useMemo)(() => ve(e, n), [e, n]), _ = g.includes(r) ? r : g[0] ?? null, v = (0, l.useMemo)(() => _ ? P(e, t, _) : [], [
		e,
		t,
		_
	]), y = Math.max(120, u - Ai.izquierda - Ai.derecha), b = tr().domain(t).range([0, y]).padding(.14), x = v.flatMap((e) => [e.mexico, e.centroamerica]).filter((e) => e !== null), C = Math.min(100, ...x), w = Math.max(100, ...x), T = Math.max(2, (w - C) * .14), E = hr().domain([C - T, w + T]).range([ki, 0]), k = t.indexOf(s ?? ""), ee = (e) => e === k ? !0 : Math.abs(e - k) <= 1 ? !1 : e % Math.max(1, Math.ceil(t.length / (u < 520 ? 4 : 8))) === 0, A = (e) => si().x((e) => b(e.periodo) ?? 0).y((e) => E(e.valor))(v.filter((t) => t[e] !== null).map((t) => ({
		periodo: t.periodo,
		valor: t[e]
	}))) ?? "", te = (e) => {
		let t = v.filter((t) => t[e] !== null);
		return t[t.length - 1] ?? null;
	}, ne = te("mexico"), M = te("centroamerica"), re = ne?.mexico != null && M?.centroamerica != null && Math.abs(E(ne.mexico) - E(M.centroamerica)) < 13, ie = (t, n) => {
		let r = v.find((e) => e.periodo === n);
		if (!r || r[t] === null || !_) return;
		let i = r[t], s = le(e, t, n), c = le(e, t, _);
		a(n), o({
			titulo: `Índice base 100 · ${t === "mexico" ? "México" : "Centroamérica"} · ${n}`,
			valor: `${D(i, 1)} (base 100 = ${_})`,
			unidad: "índice (base 100)",
			periodo: n,
			mercado: t,
			base: "nominal",
			origen: "derivado",
			formula: `${O(s)} ÷ ${O(c)} × 100 = ${D(i, 1)}`,
			fuente: `walmex-${n.toLowerCase()}`,
			nota: "Compara niveles de importes nominales con una referencia común: no es crecimiento anual y dos trimestres distintos pueden tener estacionalidad diferente."
		});
	}, ae = _ && t.length ? j(_) < j(t[0]) || j(_) > j(t[t.length - 1]) : !1;
	return /* @__PURE__ */ (0, R.jsxs)(Cr, {
		testid: "bloque-indice",
		titulo: "Trayectorias comparables",
		sub: `Índice de importes con base 100 en ${_ ?? "—"} · la base se elige sobre la línea temporal${ae ? " · la base queda fuera del rango visible y el índice la conserva" : ""}`,
		controles: /* @__PURE__ */ (0, R.jsxs)("div", {
			className: "wm-controles-fila",
			children: [/* @__PURE__ */ (0, R.jsxs)("span", {
				className: "wm-chip",
				"data-testid": "indice-base-actual",
				children: ["Base 100 = ", _ ?? "—"]
			}), /* @__PURE__ */ (0, R.jsxs)("label", {
				className: "wm-control",
				children: [/* @__PURE__ */ (0, R.jsx)("span", {
					className: "wm-control-label",
					children: "Trimestre base"
				}), /* @__PURE__ */ (0, R.jsx)("select", {
					value: _ ?? "",
					onChange: (e) => i(e.target.value),
					"aria-label": "Trimestre base del índice",
					children: g.map((e) => /* @__PURE__ */ (0, R.jsx)("option", {
						value: e,
						children: e
					}, e))
				})]
			})]
		}),
		children: [/* @__PURE__ */ (0, R.jsx)("div", {
			className: "wm-grafica",
			ref: c,
			"data-testid": "indice-grafica",
			children: u > 0 && _ ? /* @__PURE__ */ (0, R.jsx)("svg", {
				width: u,
				height: ki + Ai.arriba + Ai.abajo,
				role: "img",
				"aria-label": `Índice base 100 en ${_} de México y Centroamérica: ${v.map((e) => `${e.periodo} México ${e.mexico === null ? "sin dato" : D(e.mexico, 0)} y Centroamérica ${e.centroamerica === null ? "sin dato" : D(e.centroamerica, 0)}`).join("; ")}`,
				onMouseMove: (e) => {
					let n = e.currentTarget.getBoundingClientRect(), r = e.clientX - n.left - Ai.izquierda, i = null, a = Infinity;
					for (let e of t) {
						let t = Math.abs((b(e) ?? 0) - r);
						t < a && (a = t, i = e);
					}
					i && f({
						x: e.clientX,
						y: e.clientY,
						periodo: i
					});
				},
				onMouseLeave: () => f(null),
				children: /* @__PURE__ */ (0, R.jsxs)("g", {
					transform: `translate(${Ai.izquierda},${Ai.arriba})`,
					children: [
						E.ticks(4).map((e) => /* @__PURE__ */ (0, R.jsxs)("g", { children: [/* @__PURE__ */ (0, R.jsx)("line", {
							x1: 0,
							x2: y,
							y1: E(e),
							y2: E(e),
							className: "wm-rejilla"
						}), /* @__PURE__ */ (0, R.jsx)("text", {
							x: -8,
							y: E(e) + 3,
							textAnchor: "end",
							className: "wm-eje",
							children: D(e, 0)
						})] }, `eje-${e}`)),
						/* @__PURE__ */ (0, R.jsx)("line", {
							x1: 0,
							x2: y,
							y1: E(100),
							y2: E(100),
							className: "wm-cero-fuerte"
						}),
						/* @__PURE__ */ (0, R.jsxs)("text", {
							x: y,
							y: E(100) - 6,
							textAnchor: "end",
							className: "wm-eje-sutil",
							children: ["100 · base ", _]
						}),
						b(_) === void 0 ? null : /* @__PURE__ */ (0, R.jsxs)("g", { children: [/* @__PURE__ */ (0, R.jsx)("line", {
							x1: b(_) ?? 0,
							x2: b(_) ?? 0,
							y1: 0,
							y2: ki,
							className: "wm-cursor-base"
						}), /* @__PURE__ */ (0, R.jsx)("circle", {
							cx: b(_) ?? 0,
							cy: E(100),
							r: 4,
							fill: "#111318"
						})] }),
						/* @__PURE__ */ (0, R.jsxs)("g", {
							className: h ? void 0 : "wm-transicion",
							children: [
								["mexico", "centroamerica"].map((e) => /* @__PURE__ */ (0, R.jsx)("path", {
									d: A(e),
									fill: "none",
									stroke: S[e],
									strokeWidth: p === null || p === e ? 2.4 : 1.4,
									opacity: p === null || p === e ? 1 : .4,
									onMouseEnter: () => m(e),
									onMouseLeave: () => m(null)
								}, `trazo-${e}`)),
								["mexico", "centroamerica"].map((e) => v.map((t) => {
									let n = t[e];
									if (n === null) return null;
									let r = t.periodo === s;
									return /* @__PURE__ */ (0, R.jsx)("circle", {
										cx: b(t.periodo) ?? 0,
										cy: E(n),
										r: r ? 5 : 2.6,
										fill: r ? "#111318" : S[e],
										stroke: "#fff",
										strokeWidth: r ? 1.2 : .8,
										opacity: p === null || p === e ? 1 : .4,
										role: "button",
										tabIndex: 0,
										"aria-label": `${t.periodo} ${e === "mexico" ? "México" : "Centroamérica"}: índice ${D(n, 1)}`,
										onFocus: () => m(e),
										onBlur: () => m(null),
										onClick: () => ie(e, t.periodo),
										onKeyDown: (n) => {
											(n.key === "Enter" || n.key === " ") && (n.preventDefault(), ie(e, t.periodo));
										}
									}, `${e}-${t.periodo}`);
								})),
								ne ? /* @__PURE__ */ (0, R.jsxs)("text", {
									x: (b(ne.periodo) ?? 0) + 8,
									y: E(ne.mexico) + 3 + (re ? -7 : 0),
									className: "wm-etiqueta-directa",
									fill: S.mexico,
									children: ["MX ", D(ne.mexico, 0)]
								}) : null,
								M ? /* @__PURE__ */ (0, R.jsxs)("text", {
									x: (b(M.periodo) ?? 0) + 8,
									y: E(M.centroamerica) + 3 + (re ? 7 : 0),
									className: "wm-etiqueta-directa",
									fill: S.centroamerica,
									children: ["CA ", D(M.centroamerica, 0)]
								}) : null
							]
						}, _),
						t.map((e, t) => ee(t) ? /* @__PURE__ */ (0, R.jsx)("text", {
							x: b(e) ?? 0,
							y: 272,
							textAnchor: "middle",
							className: `wm-eje${e === s ? " is-activo" : ""}`,
							children: e
						}, `eje-x-${e}`) : null),
						d ? /* @__PURE__ */ (0, R.jsx)("line", {
							x1: b(d.periodo) ?? 0,
							x2: b(d.periodo) ?? 0,
							y1: -6,
							y2: ki,
							className: "wm-cursor"
						}) : null,
						/* @__PURE__ */ (0, R.jsxs)("g", {
							transform: "translate(0,284)",
							children: [
								/* @__PURE__ */ (0, R.jsx)("rect", {
									x: -6,
									y: -9,
									width: y + 12,
									height: 18,
									rx: 9,
									fill: "#F2F4FA"
								}),
								/* @__PURE__ */ (0, R.jsx)("text", {
									x: -10,
									y: 4,
									textAnchor: "end",
									className: "wm-eje-sutil",
									children: "base"
								}),
								t.map((e) => {
									let t = g.includes(e), n = e === _;
									return /* @__PURE__ */ (0, R.jsxs)("g", {
										className: t ? "wm-tira-base" : void 0,
										onClick: () => t && i(e),
										role: t ? "button" : void 0,
										tabIndex: t ? 0 : -1,
										"aria-label": t ? `Usar ${e} como trimestre base` : void 0,
										"aria-pressed": n,
										onKeyDown: (n) => {
											t && (n.key === "Enter" || n.key === " ") && (n.preventDefault(), i(e));
										},
										children: [/* @__PURE__ */ (0, R.jsx)("rect", {
											x: (b(e) ?? 0) - 7,
											y: -7,
											width: 14,
											height: 14,
											fill: "transparent"
										}), /* @__PURE__ */ (0, R.jsx)("circle", {
											cx: b(e) ?? 0,
											cy: 0,
											r: n ? 5.5 : 3.6,
											fill: n ? "#111318" : t ? "#B9C1D0" : "#E4E8F0"
										})]
									}, `base-${e}`);
								})
							]
						})
					]
				})
			}) : /* @__PURE__ */ (0, R.jsx)("p", {
				className: "wm-vacio",
				children: "No hay un trimestre base con importes mayores que cero para ambos mercados."
			})
		}), /* @__PURE__ */ (0, R.jsx)(Er, {
			visible: d !== null,
			x: d?.x ?? 0,
			y: d?.y ?? 0,
			testid: "tooltip-indice",
			children: d ? (() => {
				let e = v.find((e) => e.periodo === d.periodo);
				return e ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
					/* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-titulo",
						children: [
							e.periodo,
							" · base 100 = ",
							_
						]
					}),
					/* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-linea",
						children: [
							/* @__PURE__ */ (0, R.jsx)("span", {
								className: "wm-punto-color",
								style: { background: S.mexico }
							}),
							" ",
							"México",
							" ",
							/* @__PURE__ */ (0, R.jsx)("strong", { children: e.mexico === null ? "sin dato" : D(e.mexico, 1) })
						]
					}),
					/* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-linea",
						children: [
							/* @__PURE__ */ (0, R.jsx)("span", {
								className: "wm-punto-color",
								style: { background: S.centroamerica }
							}),
							" ",
							"Centroamérica",
							" ",
							/* @__PURE__ */ (0, R.jsx)("strong", { children: e.centroamerica === null ? "sin dato" : D(e.centroamerica, 1) })
						]
					}),
					/* @__PURE__ */ (0, R.jsx)("p", {
						className: "wm-tooltip-fuente",
						children: "índice = importe ÷ importe base × 100 · estacionalidad no corregida"
					})
				] }) : null;
			})() : null
		})]
	});
}
// src/ui/Mezcla.tsx
var Mi = 236, Ni = {
	arriba: 16,
	derecha: 74,
	abajo: 28,
	izquierda: 58
};
function Pi({ filas: e, periodo: t, modo: n, onCambiarModo: r, onSeleccionarPeriodo: i, onSeleccionar: a, resaltado: o, hoverPeriodo: s, onHoverPeriodo: c }) {
	let [u, d] = wr(280), [f, p] = (0, l.useState)(null), m = n === "participacion", h = (0, l.useMemo)(() => e.filter((e) => e.mexico !== null && e.centroamerica !== null), [e]), g = Math.max(120, d - Ni.izquierda - Ni.derecha), _ = tr().domain(h.map((e) => e.periodo)).range([0, g]).padding(.18), v = h.map((e) => ({
		periodo: e.periodo,
		mexico: e.mexico,
		centroamerica: e.centroamerica,
		base: m ? e.total ?? e.mexico + e.centroamerica : 1,
		baseReal: e.total ?? e.mexico + e.centroamerica,
		total: e.total,
		suma: e.mexico + e.centroamerica
	})), y = v.map((e) => m ? 100 : e.mexico + e.centroamerica), b = m ? 100 : Math.max(1, ...y), x = hr().domain([0, b * (m ? 1 : 1.04)]).range([Mi, 0]), C = (e, t) => {
		let n = m ? 100 * t / e.base : t;
		return x(n);
	}, w = v.map((e) => ({
		periodo: e.periodo,
		x: _(e.periodo) ?? 0,
		yMexico: C(e, e.mexico),
		yTotal: C(e, e.mexico + e.centroamerica)
	})), T = ci().x((e) => e.x).y1((e) => e.yMexico).y0(x(0))(w), E = ci().x((e) => e.x).y1((e) => e.yTotal).y0((e) => e.yMexico)(w), D = si().x((e) => e.x).y((e) => e.yMexico)(w), k = si().x((e) => e.x).y((e) => e.yTotal)(w), A = w.findIndex((e) => e.periodo === t), te = (e) => e === A ? !0 : Math.abs(e - A) <= 1 ? !1 : e % Math.max(1, Math.ceil(w.length / (d < 460 ? 5 : 9))) === 0, ne = s ? v.findIndex((e) => e.periodo === s) : -1, j = ne >= 0 ? v[ne] : null, M = o === null || o === "mexico" ? .92 : .28, re = o === null || o === "centroamerica" ? .92 : .28, ie = (e, t) => {
		let n = t === "mexico" ? e.mexico : e.centroamerica, r = e.total ?? e.suma;
		i(e.periodo), a({
			titulo: t === "consolidado" ? `Ingresos consolidados · ${e.periodo}` : `Ingresos · ${t === "mexico" ? "México" : "Centroamérica"} · ${e.periodo}`,
			valor: `${O(n)} M MXN`,
			unidad: "millones de pesos nominales del trimestre",
			periodo: e.periodo,
			mercado: t,
			base: "nominal",
			origen: "publicado",
			formula: t === "consolidado" ? "Cifra consolidada publicada por la empresa" : `Participación = ${O(n)} ÷ ${O(r)} = ${ee(100 * n / r)}`,
			fuente: `walmex-${e.periodo.toLowerCase()}`,
			nota: Math.abs(e.suma - r) <= 1 ? "La suma de los dos mercados coincide con el consolidado publicado dentro del redondeo de la fuente." : "La suma de los dos mercados no coincide con el consolidado publicado; la diferencia se trata como residual y no se reparte."
		});
	};
	return /* @__PURE__ */ (0, R.jsxs)(Cr, {
		testid: "bloque-mezcla",
		titulo: "Mezcla del negocio",
		sub: "México y Centroamérica por trimestre · el consolidado es el total publicado",
		controles: /* @__PURE__ */ (0, R.jsxs)("div", {
			className: "wm-segmentado",
			role: "group",
			"aria-label": "Modo de la mezcla",
			children: [/* @__PURE__ */ (0, R.jsx)("button", {
				type: "button",
				className: `wm-seg${m ? "" : " is-activa"}`,
				"aria-pressed": !m,
				onClick: () => r("importe"),
				children: "Importe"
			}), /* @__PURE__ */ (0, R.jsx)("button", {
				type: "button",
				className: `wm-seg${m ? " is-activa" : ""}`,
				"aria-pressed": m,
				onClick: () => r("participacion"),
				children: "Participación"
			})]
		}),
		children: [
			/* @__PURE__ */ (0, R.jsx)("div", {
				className: "wm-grafica",
				ref: u,
				"data-testid": "mezcla-grafica",
				children: d > 0 && w.length ? /* @__PURE__ */ (0, R.jsx)("svg", {
					width: d,
					height: Mi + Ni.arriba + Ni.abajo,
					role: "img",
					"aria-label": `Mezcla de ingresos por trimestre entre México y Centroamérica en ${m ? "participación" : "millones de pesos"}: ${v.map((e) => `${e.periodo} México ${O(e.mexico)}, Centroamérica ${O(e.centroamerica)}`).join("; ")}.`,
					onPointerMove: (e) => {
						let t = e.currentTarget.getBoundingClientRect(), n = e.clientX - t.left - Ni.izquierda, r = null, i = Infinity;
						for (let e of w) {
							let t = Math.abs(e.x - n);
							t < i && (i = t, r = e);
						}
						r && i < g / Math.max(2, w.length - 1) ? (c(r.periodo), p({
							x: e.clientX,
							y: e.clientY
						})) : (c(null), p(null));
					},
					onPointerLeave: () => {
						c(null), p(null);
					},
					onClick: () => {
						j && ie(j, "consolidado");
					},
					children: /* @__PURE__ */ (0, R.jsxs)("g", {
						transform: `translate(${Ni.izquierda},${Ni.arriba})`,
						children: [
							x.ticks(4).map((e) => /* @__PURE__ */ (0, R.jsxs)("g", { children: [/* @__PURE__ */ (0, R.jsx)("line", {
								x1: 0,
								x2: g,
								y1: x(e),
								y2: x(e),
								className: "wm-rejilla"
							}), /* @__PURE__ */ (0, R.jsx)("text", {
								x: -10,
								y: x(e) + 3,
								textAnchor: "end",
								className: "wm-eje",
								children: m ? `${e} %` : O(e)
							})] }, `eje-${e}`)),
							w.map((e) => /* @__PURE__ */ (0, R.jsx)("line", {
								x1: e.x,
								x2: e.x,
								y1: 0,
								y2: Mi,
								className: "wm-guia"
							}, `guia-${e.periodo}`)),
							/* @__PURE__ */ (0, R.jsxs)("g", {
								className: "wm-transicion",
								children: [
									/* @__PURE__ */ (0, R.jsx)("path", {
										d: T ?? "",
										fill: S.mexico,
										opacity: M * .55
									}),
									/* @__PURE__ */ (0, R.jsx)("path", {
										d: E ?? "",
										fill: S.centroamerica,
										opacity: re * .55
									}),
									/* @__PURE__ */ (0, R.jsx)("path", {
										d: D ?? "",
										fill: "none",
										stroke: S.mexico,
										strokeWidth: 2
									}),
									/* @__PURE__ */ (0, R.jsx)("path", {
										d: k ?? "",
										fill: "none",
										stroke: S.centroamerica,
										strokeWidth: 2
									})
								]
							}, n),
							w.map((e) => /* @__PURE__ */ (0, R.jsxs)("g", { children: [/* @__PURE__ */ (0, R.jsx)("circle", {
								cx: e.x,
								cy: e.yMexico,
								r: 2.6,
								fill: S.mexico
							}), /* @__PURE__ */ (0, R.jsx)("circle", {
								cx: e.x,
								cy: e.yTotal,
								r: 2.6,
								fill: S.centroamerica
							})] }, `punto-${e.periodo}`)),
							s ? /* @__PURE__ */ (0, R.jsx)("line", {
								x1: _(s) ?? 0,
								x2: _(s) ?? 0,
								y1: -6,
								y2: Mi,
								className: "wm-cursor"
							}) : null,
							t && _(t) !== void 0 ? /* @__PURE__ */ (0, R.jsxs)("g", { children: [/* @__PURE__ */ (0, R.jsx)("line", {
								x1: _(t) ?? 0,
								x2: _(t) ?? 0,
								y1: -6,
								y2: Mi,
								className: "wm-cursor-fuerte"
							}), /* @__PURE__ */ (0, R.jsx)("circle", {
								cx: _(t) ?? 0,
								cy: w.find((e) => e.periodo === t)?.yTotal ?? Mi,
								r: 4.5,
								fill: "#111318",
								stroke: "#fff",
								strokeWidth: 1.4
							})] }) : null,
							w.length && d >= 520 ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)("text", {
								x: Math.min(g - 2, (_(w[w.length - 1].periodo) ?? 0) + 10),
								y: w[w.length - 1].yTotal + 4,
								textAnchor: (_(w[w.length - 1].periodo) ?? 0) + 10 > g - 2 ? "end" : "start",
								className: "wm-etiqueta-directa",
								fill: S.centroamerica,
								children: "Centroamérica"
							}), /* @__PURE__ */ (0, R.jsx)("text", {
								x: Math.min(g - 2, (_(w[w.length - 1].periodo) ?? 0) + 10),
								y: (w[w.length - 1].yMexico + Mi) / 2 + 4,
								textAnchor: (_(w[w.length - 1].periodo) ?? 0) + 10 > g - 2 ? "end" : "start",
								className: "wm-etiqueta-directa",
								fill: S.mexico,
								children: "México"
							})] }) : null,
							w.map((e, n) => te(n) ? /* @__PURE__ */ (0, R.jsx)("text", {
								x: e.x,
								y: 254,
								textAnchor: "middle",
								className: `wm-eje${e.periodo === t ? " is-activo" : ""}`,
								children: e.periodo
							}, `eje-x-${e.periodo}`) : null)
						]
					})
				}) : /* @__PURE__ */ (0, R.jsx)("p", {
					className: "wm-vacio",
					children: "Sin importes publicados para el rango seleccionado."
				})
			}),
			/* @__PURE__ */ (0, R.jsxs)("ul", {
				className: "wm-leyenda wm-leyenda--compacta",
				children: [
					/* @__PURE__ */ (0, R.jsxs)("li", { children: [/* @__PURE__ */ (0, R.jsx)("span", {
						className: "wm-punto-color",
						style: { background: S.mexico }
					}), " México"] }),
					/* @__PURE__ */ (0, R.jsxs)("li", { children: [
						/* @__PURE__ */ (0, R.jsx)("span", {
							className: "wm-punto-color",
							style: { background: S.centroamerica }
						}),
						" ",
						"Centroamérica"
					] }),
					/* @__PURE__ */ (0, R.jsx)("li", {
						className: "wm-tenue",
						children: "área entre trimestres: interpolación lineal"
					}),
					m ? /* @__PURE__ */ (0, R.jsx)("li", {
						className: "wm-tenue",
						children: "base 100 %: consolidado publicado"
					}) : null
				]
			}),
			/* @__PURE__ */ (0, R.jsx)(Er, {
				visible: f !== null && j !== null,
				x: f?.x ?? 0,
				y: f?.y ?? 0,
				testid: "tooltip-mezcla",
				children: j ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
					/* @__PURE__ */ (0, R.jsx)("p", {
						className: "wm-tooltip-titulo",
						children: j.periodo
					}),
					/* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-linea",
						children: [
							/* @__PURE__ */ (0, R.jsx)("span", {
								className: "wm-punto-color",
								style: { background: S.mexico }
							}),
							" México",
							" ",
							/* @__PURE__ */ (0, R.jsx)("strong", { children: ee(100 * j.mexico / j.baseReal) })
						]
					}),
					/* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-linea",
						children: [
							/* @__PURE__ */ (0, R.jsx)("span", {
								className: "wm-punto-color",
								style: { background: S.centroamerica }
							}),
							" ",
							"Centroamérica",
							" ",
							/* @__PURE__ */ (0, R.jsx)("strong", { children: ee(100 * j.centroamerica / j.baseReal) })
						]
					}),
					/* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-linea",
						children: ["Total publicado ", /* @__PURE__ */ (0, R.jsxs)("strong", { children: [O(j.total ?? j.suma), " M MXN"] })]
					}),
					/* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-fuente",
						children: [m ? "participación sobre el consolidado · " : "", "superficie entre puntos: interpolación lineal"]
					})
				] }) : null
			})
		]
	});
}
// src/ui/Motores.tsx
var Fi = 300, Ii = {
	arriba: 26,
	derecha: 24,
	abajo: 44,
	izquierda: 52
}, Li = 34, Ri = 12, zi = 900;
function Bi({ paneles: e, periodos: t, seleccionado: n, vista: r, onCambiarVista: i, onSeleccionarPeriodo: a, onSeleccionar: o, cobertura: s }) {
	let [c, u] = wr(300), [d, f] = (0, l.useState)(null), [p, m] = (0, l.useState)(!1), h = Tr(), g = (0, l.useRef)(!1), _ = r === "mexico" || r === "centroamerica" ? r : "comparar", v = e.filter((e) => _ === "comparar" || e.mercado === _), y = (0, l.useMemo)(() => {
		let t = (e) => {
			let t = e.filter((e) => Number.isFinite(e)), n = Math.min(0, ...t), r = Math.max(0, ...t), i = Math.max(.6, (r - n) * .12);
			return hr().domain([n - i, r + i]);
		};
		return {
			x: t(e.flatMap((e) => e.puntos.map((e) => e.trafico))),
			y: t(e.flatMap((e) => e.puntos.map((e) => e.ticket)))
		};
	}, [e]), b = v.length > 1 && u >= 620 ? 2 : 1, x = Math.max(240, Math.floor((u - (b - 1) * 18) / b)), C = Math.max(120, x - Ii.izquierda - Ii.derecha), w = Fi - Ii.arriba - Ii.abajo, T = y.x.copy().range([0, C]), E = y.y.copy().range([w, 0]), O = n ? t.indexOf(n) : -1, ee = (e) => {
		let n = t.indexOf(e);
		return O >= 0 && n >= 0 && n < O;
	}, A = (e) => {
		let n = [...e.puntos].sort((e, n) => t.indexOf(e.periodo) - t.indexOf(n.periodo)), r = [], i = [];
		return n.forEach((e, a) => {
			if (a === 0) {
				i = [e];
				return;
			}
			let o = n[a - 1];
			t.indexOf(e.periodo) - t.indexOf(o.periodo) === 1 ? i.push(e) : (r.push(i), i = [e]);
		}), i.length && r.push(i), r;
	}, te = (e) => {
		let t = e.puntos;
		if (!t.length) return [];
		let r = [];
		n && t.some((e) => e.periodo === n) && r.push(n);
		for (let e of [t[t.length - 1].periodo, t[0].periodo]) r.includes(e) || r.push(e);
		let i = [], a = [], o = [
			{
				dx: 9,
				dy: -7,
				ancla: "start"
			},
			{
				dx: -9,
				dy: -7,
				ancla: "end"
			},
			{
				dx: 9,
				dy: 14,
				ancla: "start"
			},
			{
				dx: -9,
				dy: 14,
				ancla: "end"
			},
			{
				dx: 0,
				dy: -13,
				ancla: "middle"
			},
			{
				dx: 0,
				dy: 20,
				ancla: "middle"
			}
		];
		for (let e of r) {
			let r = t.find((t) => t.periodo === e);
			if (!r) continue;
			let s = !1;
			for (let t of o) {
				let n = T(r.trafico) + t.dx, o = E(r.ticket) + t.dy, c = t.ancla === "start" ? n : t.ancla === "end" ? n - Li : n - Li / 2, l = o - Ri + 3, u = {
					x0: c,
					x1: c + Li,
					y0: l,
					y1: o + 3
				}, d = c < -2 || u.x1 > C + 2 || l < -Ii.arriba + 2 || u.y1 > w + Ii.abajo - 6, f = i.some((e) => c < e.x1 && u.x1 > e.x0 && l < e.y1 && u.y1 > e.y0);
				if (!(d || f)) {
					i.push(u), a.push({
						periodo: e,
						x: n,
						y: o,
						ancla: t.ancla
					}), s = !0;
					break;
				}
			}
			!s && e === n && a.push({
				periodo: e,
				x: T(r.trafico) + 9,
				y: E(r.ticket) - 7,
				ancla: "start"
			});
		}
		return a;
	}, ne = (e, t) => {
		let n = e.puntos.find((e) => e.periodo === t);
		n && (a(t), o({
			titulo: `Tráfico y ticket · ${e.etiqueta} · ${t}`,
			valor: `tráfico ${k(n.trafico)} · ticket ${k(n.ticket)}`,
			unidad: "variación anual publicada",
			periodo: t,
			mercado: e.mercado,
			base: "publicado_comunicado",
			origen: "publicado",
			formula: "Variaciones anuales publicadas por la empresa para cada variable",
			fuente: `walmex-${t.toLowerCase()}`,
			nota: n.mismas_tiendas === null ? "La empresa no publicó unidades iguales para este trimestre. El producto de tráfico y ticket no se usa como reproducción exacta de las ventas comparables." : `Unidades iguales publicadas: ${k(n.mismas_tiendas)}. El producto de tráfico y ticket no reproduce exactamente esa variación.`
		}));
	}, j = v[0] ?? e[0], M = (0, l.useMemo)(() => [...j?.puntos ?? []].sort((e, n) => t.indexOf(e.periodo) - t.indexOf(n.periodo)).map((e) => e.periodo), [j, t]);
	(0, l.useEffect)(() => {
		if (!p) return;
		if (!M.length) {
			m(!1);
			return;
		}
		let e = window.setTimeout(() => {
			let e = n ? M.indexOf(n) : -1, t = M[(e + 1) % M.length];
			a(t);
		}, zi);
		return () => window.clearTimeout(e);
	}, [
		p,
		n,
		M,
		a
	]), (0, l.useEffect)(() => {
		m(!1);
	}, [_]), (0, l.useEffect)(() => () => m(!1), []);
	let re = (0, l.useCallback)((e, t) => {
		let n = v[0];
		if (!n) return;
		let r = t.getBoundingClientRect(), i = r.width / x, o = (e - r.left) / i - Ii.izquierda, s = null, c = Infinity;
		for (let e of n.puntos) {
			let t = Math.abs(T(e.trafico) - o);
			t < c && (c = t, s = e.periodo);
		}
		s && c < C / 3 && a(s);
	}, [
		v,
		x,
		T,
		C,
		a
	]), ie = (e) => {
		if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
		e.preventDefault();
		let t = n ? M.indexOf(n) : -1, r = e.key === "ArrowRight" ? Math.min(M.length - 1, t + 1) : Math.max(0, (t < 0 ? M.length : t) - 1);
		a(M[r]);
	}, ae = (e) => `${D(e, +!Number.isInteger(e))} %`;
	return /* @__PURE__ */ (0, R.jsxs)(Cr, {
		testid: "bloque-motores",
		protagonista: !0,
		titulo: "Tráfico y ticket",
		sub: `${_ === "comparar" ? "Ambos mercados" : _ === "mexico" ? "México" : "Centroamérica"} · ${s} trimestres con ambas variables · variación anual`,
		controles: /* @__PURE__ */ (0, R.jsxs)("div", {
			className: "wm-controles-fila",
			children: [
				/* @__PURE__ */ (0, R.jsx)("div", {
					className: "wm-segmentado",
					role: "group",
					"aria-label": "Mercado de la trayectoria",
					children: [
						["mexico", "México"],
						["centroamerica", "Centroamérica"],
						["comparar", "Comparar"]
					].map(([e, t]) => /* @__PURE__ */ (0, R.jsx)("button", {
						type: "button",
						className: `wm-seg${_ === e ? " is-activa" : ""}`,
						"aria-pressed": _ === e,
						onClick: () => i(e),
						children: t
					}, e))
				}),
				/* @__PURE__ */ (0, R.jsxs)("button", {
					type: "button",
					className: `wm-btn-ico${p ? " is-activo" : ""}`,
					onClick: () => m((e) => !e),
					"aria-label": p ? "Pausar la reproducción de trimestres" : "Reproducir los trimestres observados",
					"aria-pressed": p,
					"data-testid": "motores-reproducir",
					children: [p ? "❚❚" : "▶", /* @__PURE__ */ (0, R.jsx)("span", { children: p ? "Pausa" : "Reproducir" })]
				}),
				p ? /* @__PURE__ */ (0, R.jsx)("span", {
					className: "wm-reproduciendo",
					"data-testid": "motores-estado-reproduccion",
					children: n ?? ""
				}) : null
			]
		}),
		children: [/* @__PURE__ */ (0, R.jsx)("div", {
			className: "wm-grafica wm-grafica--motores",
			ref: c,
			"data-testid": "motores-grafica",
			children: u > 0 ? v.map((e) => {
				let t = S[e.mercado] ?? "#3458F5", r = e.puntos, i = `clip-${e.mercado}`;
				return /* @__PURE__ */ (0, R.jsxs)("figure", {
					className: "wm-figura",
					style: { width: x },
					children: [/* @__PURE__ */ (0, R.jsxs)("figcaption", { children: [e.etiqueta, /* @__PURE__ */ (0, R.jsxs)("span", {
						className: "wm-figura-nota",
						children: [
							" · ",
							r.length,
							" trimestres"
						]
					})] }), /* @__PURE__ */ (0, R.jsxs)("svg", {
						width: x,
						height: Fi,
						role: "img",
						tabIndex: 0,
						className: h ? void 0 : "wm-svg-suave",
						style: { touchAction: "pan-y" },
						"aria-label": `Trayectoria de tráfico y ticket de ${e.etiqueta}: ${r.map((e) => `${e.periodo} ${k(e.trafico)} y ${k(e.ticket)}`).join("; ")}`,
						onKeyDown: ie,
						onPointerDown: (e) => {
							g.current = !0, e.currentTarget.setPointerCapture(e.pointerId), re(e.clientX, e.currentTarget);
						},
						onPointerMove: (e) => {
							g.current && re(e.clientX, e.currentTarget);
						},
						onPointerUp: () => {
							g.current = !1;
						},
						onPointerCancel: () => {
							g.current = !1;
						},
						children: [/* @__PURE__ */ (0, R.jsxs)("defs", { children: [/* @__PURE__ */ (0, R.jsx)("marker", {
							id: `flecha-${e.mercado}`,
							viewBox: "0 0 8 8",
							refX: "6",
							refY: "4",
							markerWidth: "5",
							markerHeight: "5",
							orient: "auto-start-reverse",
							children: /* @__PURE__ */ (0, R.jsx)("path", {
								d: "M0,0 L8,4 L0,8 z",
								fill: t,
								opacity: "0.7"
							})
						}), /* @__PURE__ */ (0, R.jsx)("clipPath", {
							id: i,
							children: /* @__PURE__ */ (0, R.jsx)("rect", {
								x: 0,
								y: 0,
								width: C,
								height: w
							})
						})] }), /* @__PURE__ */ (0, R.jsxs)("g", {
							transform: `translate(${Ii.izquierda},${Ii.arriba})`,
							children: [
								/* @__PURE__ */ (0, R.jsx)("text", {
									x: 4,
									y: w - 10,
									className: "wm-cuadrante",
									children: "tráfico ↓ · ticket ↓"
								}),
								/* @__PURE__ */ (0, R.jsx)("text", {
									x: C - 4,
									y: w - 10,
									textAnchor: "end",
									className: "wm-cuadrante",
									children: "tráfico ↑ · ticket ↓"
								}),
								/* @__PURE__ */ (0, R.jsx)("text", {
									x: 4,
									y: 16,
									className: "wm-cuadrante",
									children: "tráfico ↓ · ticket ↑"
								}),
								/* @__PURE__ */ (0, R.jsx)("text", {
									x: C - 4,
									y: 16,
									textAnchor: "end",
									className: "wm-cuadrante",
									children: "tráfico ↑ · ticket ↑"
								}),
								/* @__PURE__ */ (0, R.jsx)("line", {
									x1: 0,
									x2: C,
									y1: E(0),
									y2: E(0),
									className: "wm-cero"
								}),
								/* @__PURE__ */ (0, R.jsx)("line", {
									x1: T(0),
									x2: T(0),
									y1: 0,
									y2: w,
									className: "wm-cero"
								}),
								y.x.ticks(5).map((e) => /* @__PURE__ */ (0, R.jsx)("text", {
									x: T(e),
									y: w + 16,
									textAnchor: "middle",
									className: "wm-eje",
									children: ae(e)
								}, `ex-${e}`)),
								y.y.ticks(4).map((e) => /* @__PURE__ */ (0, R.jsx)("text", {
									x: -10,
									y: E(e) + 3,
									textAnchor: "end",
									className: "wm-eje",
									children: ae(e)
								}, `ey-${e}`)),
								/* @__PURE__ */ (0, R.jsx)("text", {
									x: C,
									y: w + 34,
									textAnchor: "end",
									className: "wm-eje-sutil",
									children: "tráfico (% anual) →"
								}),
								/* @__PURE__ */ (0, R.jsx)("text", {
									x: -Ii.izquierda + 2,
									y: -10,
									className: "wm-eje-sutil",
									children: "↑ ticket (% anual)"
								}),
								/* @__PURE__ */ (0, R.jsx)("g", {
									clipPath: `url(#${i})`,
									children: A(e).map((n, r) => n.length > 1 ? /* @__PURE__ */ (0, R.jsx)("path", {
										d: n.map((e, t) => `${t === 0 ? "M" : "L"}${T(e.trafico)},${E(e.ticket)}`).join(" "),
										fill: "none",
										stroke: t,
										strokeWidth: 1.6,
										opacity: n.every((e) => ee(e.periodo)) ? .45 : .75,
										markerEnd: `url(#flecha-${e.mercado})`
									}, `tramo-${r}`) : null)
								}),
								r.map((r) => {
									let i = r.periodo === n, a = d?.periodo === r.periodo && d.mercado === e.mercado;
									return /* @__PURE__ */ (0, R.jsx)("circle", {
										cx: T(r.trafico),
										cy: E(r.ticket),
										r: i ? 6 : 4,
										fill: i || a ? "#111318" : t,
										stroke: "#FFFFFF",
										strokeWidth: 1.2,
										opacity: i || a || !ee(r.periodo) ? 1 : .72,
										role: "button",
										tabIndex: 0,
										"aria-label": `${r.periodo}: tráfico ${k(r.trafico)}, ticket ${k(r.ticket)}`,
										onMouseEnter: (t) => f({
											x: t.clientX,
											y: t.clientY,
											periodo: r.periodo,
											mercado: e.mercado
										}),
										onMouseMove: (e) => f((t) => t ? {
											...t,
											x: e.clientX,
											y: e.clientY
										} : null),
										onMouseLeave: () => f(null),
										onFocus: () => f({
											x: Math.max(140, window.innerWidth / 2),
											y: 140,
											periodo: r.periodo,
											mercado: e.mercado
										}),
										onBlur: () => f(null),
										onClick: () => ne(e, r.periodo),
										onKeyDown: (t) => {
											(t.key === "Enter" || t.key === " ") && (t.preventDefault(), ne(e, r.periodo));
										}
									}, r.periodo);
								}),
								te(e).map((e) => /* @__PURE__ */ (0, R.jsx)("text", {
									x: e.x,
									y: e.y,
									textAnchor: e.ancla,
									className: `wm-valor${e.periodo === n ? " is-activo" : ""}`,
									children: e.periodo
								}, `etiqueta-${e.periodo}`))
							]
						})]
					})]
				}, e.mercado);
			}) : null
		}), /* @__PURE__ */ (0, R.jsx)(Er, {
			visible: d !== null,
			x: d?.x ?? 0,
			y: d?.y ?? 0,
			testid: "tooltip-motores",
			children: d ? (() => {
				let t = e.find((e) => e.mercado === d.mercado), n = t?.puntos.find((e) => e.periodo === d.periodo);
				return n ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
					/* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-titulo",
						children: [
							t?.etiqueta,
							" · ",
							n.periodo
						]
					}),
					/* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-linea",
						children: [
							"Tráfico ",
							/* @__PURE__ */ (0, R.jsx)("strong", { children: k(n.trafico) }),
							" · Ticket",
							" ",
							/* @__PURE__ */ (0, R.jsx)("strong", { children: k(n.ticket) })
						]
					}),
					/* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-linea",
						children: [
							"Unidades iguales",
							" ",
							/* @__PURE__ */ (0, R.jsx)("strong", { children: n.mismas_tiendas === null ? "no publicado" : k(n.mismas_tiendas) })
						]
					}),
					/* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-fuente",
						children: ["comunicado ", n.periodo.toLowerCase()]
					})
				] }) : null;
			})() : null
		})]
	});
}
// src/ui/Puente.tsx
var Vi = 44, Hi = {
	arriba: 8,
	derecha: 104,
	abajo: 30,
	izquierda: 104
}, Ui = {
	arriba: 8,
	derecha: 78,
	abajo: 26,
	izquierda: 74
};
function Wi({ datos: e, observacion: t, onSeleccionar: n, onResaltar: r, resaltado: i }) {
	let [a, o] = wr(300), [s, c] = (0, l.useState)(null), u = e.calculable ? [...e.aportaciones.map((e) => ({
		clave: e.mercado,
		etiqueta: e.etiqueta,
		valor: e.diferencia,
		participacion: e.participacion,
		participacionInterpretable: e.participacionInterpretable,
		detalle: `Ingresos ${O(e.importePrevio)} → ${O(e.importeActual)} M MXN`
	})), ...e.residualInterpretable ? [{
		clave: "residual",
		etiqueta: "Residual",
		valor: -e.residual,
		participacion: null,
		participacionInterpretable: !1,
		detalle: "Diferencia entre la suma de los mercados y el consolidado publicado"
	}] : []] : [], d = u.map((e) => e.valor), f = Math.max(1, ...d, 0), p = Math.min(0, ...d), m = Math.max(.6, (f - p) * .14), h = o < 520, g = h ? Ui : Hi, _ = Math.max(120, o - g.izquierda - g.derecha), v = hr().domain([p - m, f + m]).range([0, _]), y = Math.max(96, g.arriba + Math.max(1, u.length) * Vi + g.abajo), b = v(0), x = (e) => e === "mexico" ? S.mexico : e === "centroamerica" ? S.centroamerica : "#8A93A5", C = (t) => {
		let i = e.aportaciones.find((e) => e.mercado === t);
		t === "residual" ? n({
			titulo: `Residual de conciliación · ${e.periodo}`,
			valor: `${O(Math.abs(e.residual ?? 0))} M MXN`,
			unidad: "millones de pesos",
			periodo: `${e.anterior} → ${e.periodo}`,
			mercado: null,
			base: "nominal_publicado",
			origen: "derivado",
			formula: "ΔMéxico + ΔCentroamérica − ΔConsolidado publicado",
			fuente: `walmex-${e.periodo.toLowerCase()}`,
			nota: "Diferencia de redondeo de la fuente. Se muestra como segmento propio; no se reparte entre los mercados ni se atribuye a una causa."
		}) : i && (r(i.mercado), n({
			titulo: `Aportación de ${i.etiqueta} · ${e.anterior} → ${e.periodo}`,
			valor: `${(i.diferencia ?? 0) > 0 ? "+" : "−"}${O(Math.abs(i.diferencia ?? 0))} M MXN`,
			unidad: "millones de pesos",
			periodo: `${e.anterior} → ${e.periodo}`,
			mercado: i.mercado,
			base: "nominal_publicado",
			origen: "derivado",
			formula: `Ingresos de ${i.etiqueta} en ${e.periodo} (${O(i.importeActual)}) − en ${e.anterior} (${O(i.importePrevio)}). ` + (i.participacionInterpretable ? `Participación en el cambio = ${D(i.diferencia ?? 0, 0)} ÷ ${D(e.cambioTotal ?? 0, 0)} = ${k(i.participacion)}` : "La participación en el cambio no es interpretable porque la aportación y el cambio total tienen signo distinto."),
			fuente: `walmex-${e.periodo.toLowerCase()}`,
			nota: "La aportación es aritmética de importes publicados; no es una causa económica demostrada."
		}));
	};
	return /* @__PURE__ */ (0, R.jsxs)(Cr, {
		testid: "bloque-puente",
		protagonista: !0,
		titulo: "Origen del crecimiento",
		sub: `${e.anterior ?? "—"} → ${e.periodo} · aportación de cada mercado al cambio de ingresos · millones de pesos`,
		observacion: t,
		children: [/* @__PURE__ */ (0, R.jsxs)("div", {
			className: "wm-puente",
			ref: a,
			children: [/* @__PURE__ */ (0, R.jsxs)("div", {
				className: "wm-puente-cifras",
				children: [
					/* @__PURE__ */ (0, R.jsxs)("div", {
						className: "wm-cifra",
						children: [
							/* @__PURE__ */ (0, R.jsxs)("span", {
								className: "wm-cifra-etiqueta",
								children: ["Ingresos ", e.anterior ?? "—"]
							}),
							/* @__PURE__ */ (0, R.jsx)("strong", {
								className: "wm-cifra-valor",
								children: O(e.totalPrevio)
							}),
							/* @__PURE__ */ (0, R.jsx)("span", {
								className: "wm-cifra-unidad",
								children: "millones de pesos"
							})
						]
					}),
					/* @__PURE__ */ (0, R.jsxs)("div", {
						className: `wm-cifra wm-cifra--cambio${(e.cambioTotal ?? 0) < 0 ? " is-baja" : ""}`,
						children: [
							/* @__PURE__ */ (0, R.jsx)("span", {
								className: "wm-cifra-etiqueta",
								children: "Cambio total"
							}),
							/* @__PURE__ */ (0, R.jsxs)("strong", {
								className: "wm-cifra-valor",
								children: [(e.cambioTotal ?? 0) > 0 ? "+" : (e.cambioTotal ?? 0) < 0 ? "−" : "", O(Math.abs(e.cambioTotal ?? 0))]
							}),
							/* @__PURE__ */ (0, R.jsxs)("span", {
								className: "wm-cifra-unidad",
								children: ["M MXN · ", k(e.crecimiento)]
							})
						]
					}),
					/* @__PURE__ */ (0, R.jsxs)("div", {
						className: "wm-cifra",
						children: [
							/* @__PURE__ */ (0, R.jsxs)("span", {
								className: "wm-cifra-etiqueta",
								children: ["Ingresos ", e.periodo]
							}),
							/* @__PURE__ */ (0, R.jsx)("strong", {
								className: "wm-cifra-valor",
								children: O(e.totalActual)
							}),
							/* @__PURE__ */ (0, R.jsx)("span", {
								className: "wm-cifra-unidad",
								children: "millones de pesos"
							})
						]
					})
				]
			}), o > 0 && u.length ? /* @__PURE__ */ (0, R.jsx)("svg", {
				width: o,
				height: y,
				role: "img",
				"aria-label": `Aportaciones al cambio de ingresos de ${e.anterior} a ${e.periodo}: ${u.map((e) => `${e.etiqueta} ${e.valor > 0 ? "suma" : "resta"} ${O(Math.abs(e.valor))} millones`).join("; ")}. Cambio total ${O(e.cambioTotal)} millones.`,
				children: /* @__PURE__ */ (0, R.jsxs)("g", {
					transform: `translate(${g.izquierda},${g.arriba})`,
					children: [
						/* @__PURE__ */ (0, R.jsx)("line", {
							x1: b,
							x2: b,
							y1: -6,
							y2: u.length * Vi + 4,
							className: "wm-cero-fuerte"
						}),
						/* @__PURE__ */ (0, R.jsx)("text", {
							x: b,
							y: u.length * Vi + 22,
							textAnchor: "middle",
							className: "wm-eje",
							children: "0"
						}),
						e.cambioTotal === null ? null : /* @__PURE__ */ (0, R.jsxs)("g", { children: [/* @__PURE__ */ (0, R.jsx)("line", {
							x1: v(e.cambioTotal),
							x2: v(e.cambioTotal),
							y1: -4,
							y2: u.length * Vi + 4,
							className: "wm-cursor-base"
						}), /* @__PURE__ */ (0, R.jsxs)("text", {
							x: Math.min(_, Math.max(24, v(e.cambioTotal))),
							y: u.length * Vi + 22,
							textAnchor: v(e.cambioTotal) > _ - 70 ? "end" : "middle",
							className: "wm-eje-fuerte",
							children: ["total ", O(e.cambioTotal)]
						})] }),
						u.map((e, t) => {
							let n = t * Vi + Vi / 2, a = Math.min(b, v(e.valor)), o = Math.max(2, Math.abs(v(e.valor) - b)), s = i === e.clave, l = i === null || s || e.clave === "residual" ? 1 : .32, u = e.valor >= 0;
							return /* @__PURE__ */ (0, R.jsxs)("g", {
								onMouseEnter: (t) => c({
									clave: e.clave,
									x: t.clientX,
									y: t.clientY
								}),
								onMouseMove: (t) => c({
									clave: e.clave,
									x: t.clientX,
									y: t.clientY
								}),
								onMouseLeave: () => c(null),
								children: [
									/* @__PURE__ */ (0, R.jsx)("rect", {
										x: -g.izquierda,
										y: n - Vi / 2,
										width: _ + g.izquierda + g.derecha,
										height: Vi,
										fill: s ? "rgba(52,88,245,0.05)" : "transparent"
									}),
									/* @__PURE__ */ (0, R.jsx)("text", {
										x: -g.izquierda + 2,
										y: n + 4,
										className: "wm-puente-etiqueta",
										children: e.etiqueta
									}),
									/* @__PURE__ */ (0, R.jsx)("rect", {
										x: a,
										y: n - 11,
										width: o,
										height: 22,
										rx: 5,
										fill: x(e.clave),
										opacity: l,
										role: "button",
										tabIndex: 0,
										"aria-label": `${e.etiqueta}: ${u ? "suma" : "resta"} ${O(Math.abs(e.valor))} millones de pesos`,
										onFocus: () => r(e.clave === "residual" ? null : e.clave),
										onBlur: () => r(null),
										onClick: () => C(e.clave),
										onKeyDown: (t) => {
											(t.key === "Enter" || t.key === " ") && (t.preventDefault(), C(e.clave));
										}
									}),
									/* @__PURE__ */ (0, R.jsxs)("text", {
										x: u ? a + o + 10 : a - 10,
										y: n + 4,
										textAnchor: u ? "start" : "end",
										className: "wm-puente-valor",
										children: [
											u ? "+" : "−",
											O(Math.abs(e.valor)),
											e.participacionInterpretable && !h ? /* @__PURE__ */ (0, R.jsxs)("tspan", {
												className: "wm-puente-parte",
												children: [
													" · ",
													D(e.participacion ?? 0, 1),
													" %"
												]
											}) : null
										]
									})
								]
							}, e.clave);
						})
					]
				})
			}) : /* @__PURE__ */ (0, R.jsx)("p", {
				className: "wm-vacio",
				children: e.anterior ? "No hay importes comparables del mismo trimestre del año anterior para este periodo." : "Este trimestre no tiene un comparable del año anterior en la versión publicada."
			})]
		}), /* @__PURE__ */ (0, R.jsx)(Er, {
			visible: s !== null,
			x: s?.x ?? 0,
			y: s?.y ?? 0,
			testid: "tooltip-puente",
			children: s ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
				/* @__PURE__ */ (0, R.jsxs)("p", {
					className: "wm-tooltip-titulo",
					children: [
						u.find((e) => e.clave === s.clave)?.etiqueta,
						" · ",
						e.periodo
					]
				}),
				/* @__PURE__ */ (0, R.jsxs)("p", {
					className: "wm-tooltip-valor",
					children: [
						(u.find((e) => e.clave === s.clave)?.valor ?? 0) > 0 ? "+" : "−",
						O(Math.abs(u.find((e) => e.clave === s.clave)?.valor ?? 0)),
						" ",
						"M MXN"
					]
				}),
				/* @__PURE__ */ (0, R.jsx)("p", {
					className: "wm-tooltip-linea",
					children: u.find((e) => e.clave === s.clave)?.detalle
				}),
				u.find((e) => e.clave === s.clave)?.participacionInterpretable ? /* @__PURE__ */ (0, R.jsxs)("p", {
					className: "wm-tooltip-linea",
					children: [
						"Participación en el cambio:",
						" ",
						k(u.find((e) => e.clave === s.clave)?.participacion ?? null)
					]
				}) : null,
				/* @__PURE__ */ (0, R.jsxs)("p", {
					className: "wm-tooltip-fuente",
					children: ["walmex · ", e.periodo.toLowerCase()]
				})
			] }) : null
		})]
	});
}
// src/ui/Pulso.tsx
function Gi({ matriz: e, mercado: t, onCambiarMercado: n, periodos: r, periodo: i, onSeleccionarPeriodo: a, onSeleccionar: o, indicadorActivo: s, onSeleccionarIndicador: c, hoverPeriodo: u }) {
	let [d, f] = (0, l.useState)(null), [p, m] = (0, l.useState)(null), [h, g] = (0, l.useState)(null), _ = e.indicadores, v = (0, l.useMemo)(() => e.celdas.filter((e) => e.mercado === t && r.includes(e.periodo)), [
		e,
		t,
		r
	]), y = (e, t) => v.find((n) => n.indicador === e && n.periodo === t) ?? null, b = (0, l.useMemo)(() => {
		let e = v.filter((e) => e.valor !== null && e.estado === "publicado").map((e) => Math.abs(e.valor)), t = Math.max(.5, ...e);
		return Math.ceil(t / 5) * 5 || t;
	}, [v]), x = (e) => {
		if (e === null) return "transparent";
		if (e === 0) return "rgba(89, 98, 115, 0.16)";
		let t = .1 + .7 * Math.min(1, Math.sqrt(Math.abs(e) / b));
		return e > 0 ? `rgba(15, 123, 90, ${t})` : `rgba(180, 67, 63, ${t})`;
	}, S = (e) => ({
		serie: _.find((t) => t.clave === e),
		valores: r.map((t) => ({
			periodo: t,
			valor: y(e, t)?.valor ?? null
		})).filter((e) => e.valor !== null)
	}), T = (e) => {
		c(e === s ? null : e);
		let { serie: n, valores: i } = S(e);
		if (!n || !i.length) return;
		let a = i[i.length - 1], l = i.reduce((e, t) => t.valor < e.valor ? t : e), u = i.reduce((e, t) => t.valor > e.valor ? t : e), d = i.reduce((e, t) => e + t.valor, 0) / i.length;
		o({
			titulo: `${n.etiqueta} · historia en el rango`,
			valor: `${D(a.valor, 1)} % en ${a.periodo}`,
			unidad: "variación porcentual frente al mismo trimestre del año anterior",
			periodo: `${r[0]} – ${r[r.length - 1]}`,
			mercado: t,
			base: n.base,
			origen: "publicado",
			formula: null,
			fuente: `walmex-${a.periodo.toLowerCase()}`,
			nota: `${i.length} trimestres publicados en el rango. Mínimo ${D(l.valor, 1)} % (${l.periodo}) · máximo ${D(u.valor, 1)} % (${u.periodo}) · media simple ${D(d, 1)} %. Base ${ne(n.base)}. La media es descriptiva: no es una meta ni una proyección.`
		});
	}, E = (n, r) => {
		let i = y(n, r), s = _.find((e) => e.clave === n);
		i && s && (a(r), c(n), o({
			titulo: `${s.etiqueta} · ${e.mercados.find((e) => e.clave === t)?.etiqueta ?? t}`,
			valor: i.valor === null ? "No publicado" : k(i.valor),
			unidad: "variación porcentual frente al mismo trimestre del año anterior",
			periodo: r,
			mercado: t,
			base: i.base,
			origen: i.derivado ? "derivado" : "publicado",
			formula: null,
			fuente: i.fuente ?? `walmex-${r.toLowerCase()}`,
			nota: i.valor === null ? "La empresa no publicó este indicador en este trimestre: se muestra como ausencia, no como cero." : `${s.definicion}. Base ${ne(i.base)}.`
		}));
	};
	return /* @__PURE__ */ (0, R.jsxs)(Cr, {
		testid: "bloque-pulso",
		titulo: "Pulso histórico",
		sub: `Indicadores en porcentaje × trimestre · escala centrada en cero · ${e.mercados.find((e) => e.clave === t)?.etiqueta ?? t}`,
		controles: /* @__PURE__ */ (0, R.jsx)("div", {
			className: "wm-segmentado",
			role: "group",
			"aria-label": "Mercado del pulso histórico",
			children: e.mercados.map((e) => /* @__PURE__ */ (0, R.jsx)("button", {
				type: "button",
				className: `wm-seg${t === e.clave ? " is-activa" : ""}`,
				"aria-pressed": t === e.clave,
				onClick: () => n(e.clave),
				children: e.etiqueta
			}, e.clave))
		}),
		children: [/* @__PURE__ */ (0, R.jsxs)("div", {
			className: "wm-pulso",
			"data-testid": "pulso-matriz",
			children: [/* @__PURE__ */ (0, R.jsx)("div", {
				className: "wm-pulso-caja",
				children: /* @__PURE__ */ (0, R.jsxs)("table", {
					className: "wm-pulso-tabla",
					children: [
						/* @__PURE__ */ (0, R.jsxs)("caption", {
							className: "wm-sr",
							children: [
								"Variación porcentual por indicador y trimestre de",
								" ",
								e.mercados.find((e) => e.clave === t)?.etiqueta ?? t,
								"."
							]
						}),
						/* @__PURE__ */ (0, R.jsx)("thead", { children: /* @__PURE__ */ (0, R.jsxs)("tr", { children: [/* @__PURE__ */ (0, R.jsx)("th", {
							scope: "col",
							className: "wm-pulso-esquina",
							children: "Indicador"
						}), r.map((e) => /* @__PURE__ */ (0, R.jsx)("th", {
							scope: "col",
							className: `${e === i ? "is-activo" : ""}${p === e || u === e ? " is-resaltada" : ""}`,
							children: /* @__PURE__ */ (0, R.jsx)("button", {
								type: "button",
								className: "wm-pulso-cabeza",
								onClick: () => a(e),
								"aria-label": `Seleccionar ${e} para todo el tablero`,
								children: e
							})
						}, e))] }) }),
						/* @__PURE__ */ (0, R.jsx)("tbody", { children: _.map((e) => /* @__PURE__ */ (0, R.jsxs)("tr", {
							className: `${s === e.clave ? "is-activa" : ""}${d === e.clave ? " is-resaltada" : ""}`,
							onMouseEnter: () => f(e.clave),
							onMouseLeave: () => f(null),
							children: [/* @__PURE__ */ (0, R.jsx)("th", {
								scope: "row",
								children: /* @__PURE__ */ (0, R.jsxs)("button", {
									type: "button",
									className: "wm-pulso-nombre",
									onClick: () => T(e.clave),
									"aria-pressed": s === e.clave,
									children: [/* @__PURE__ */ (0, R.jsx)("span", { children: e.etiqueta }), /* @__PURE__ */ (0, R.jsx)("span", {
										className: "wm-pulso-base",
										children: ne(e.base)
									})]
								})
							}), r.map((t) => {
								let n = y(e.clave, t);
								if (!n) return /* @__PURE__ */ (0, R.jsx)("td", { children: /* @__PURE__ */ (0, R.jsx)("span", {
									className: "wm-celda is-ausente",
									"aria-hidden": "true",
									children: "—"
								}) }, t);
								let r = n.valor === null, i = n.valor === 0;
								return /* @__PURE__ */ (0, R.jsx)("td", { children: /* @__PURE__ */ (0, R.jsx)("button", {
									type: "button",
									className: `wm-celda${r ? " is-ausente" : ""}${i ? " is-cero" : ""}${p === t ? " is-columna" : ""}`,
									style: r ? void 0 : { background: x(n.valor) },
									"aria-label": `${e.etiqueta}, ${t}: ${r ? "no publicado" : k(n.valor)}`,
									onMouseEnter: (i) => {
										m(t), g({
											x: i.clientX,
											y: i.clientY,
											titulo: `${e.etiqueta} · ${t}`,
											valor: r ? "No publicado" : k(n.valor),
											detalle: ne(n.base)
										});
									},
									onMouseMove: (e) => g((t) => t ? {
										...t,
										x: e.clientX,
										y: e.clientY
									} : null),
									onMouseLeave: () => {
										m(null), g(null);
									},
									onFocus: () => {
										m(t), g(null);
									},
									onBlur: () => {
										m(null), g(null);
									},
									onClick: () => E(e.clave, t),
									children: r ? "—" : D(n.valor ?? 0, 1)
								}) }, t);
							})]
						}, e.clave)) })
					]
				})
			}), /* @__PURE__ */ (0, R.jsxs)("div", {
				className: "wm-pulso-leyenda",
				children: [
					/* @__PURE__ */ (0, R.jsxs)("span", {
						className: "wm-leyenda-escala-extremo",
						children: [D(-b, 0), " %"]
					}),
					/* @__PURE__ */ (0, R.jsx)("span", {
						className: "wm-leyenda-escala-banda",
						style: { background: "linear-gradient(90deg, rgba(180,67,63,0.82), rgba(180,67,63,0.12) 44%, rgba(89,98,115,0.18) 50%, rgba(15,123,90,0.12) 56%, rgba(15,123,90,0.82))" },
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ (0, R.jsxs)("span", {
						className: "wm-leyenda-escala-extremo",
						children: [
							"+",
							D(b, 0),
							" %"
						]
					}),
					/* @__PURE__ */ (0, R.jsxs)("span", {
						className: "wm-leyenda-item",
						children: [/* @__PURE__ */ (0, R.jsx)("span", {
							className: "wm-punto-color",
							style: { background: "rgba(89,98,115,0.30)" }
						}), " cero"]
					}),
					/* @__PURE__ */ (0, R.jsxs)("span", {
						className: "wm-leyenda-item",
						children: [/* @__PURE__ */ (0, R.jsx)("span", { className: "wm-punto-color is-ausente" }), " no publicado"]
					}),
					/* @__PURE__ */ (0, R.jsxs)("span", {
						className: "wm-leyenda-item",
						children: [
							/* @__PURE__ */ (0, R.jsx)("span", {
								className: "wm-punto-color",
								style: { background: C }
							}),
							" aumento ·",
							" ",
							/* @__PURE__ */ (0, R.jsx)("span", {
								className: "wm-punto-color",
								style: { background: w }
							}),
							" caída"
						]
					})
				]
			})]
		}), /* @__PURE__ */ (0, R.jsx)(Er, {
			visible: h !== null,
			x: h?.x ?? 0,
			y: h?.y ?? 0,
			testid: "tooltip-pulso",
			children: h ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
				/* @__PURE__ */ (0, R.jsx)("p", {
					className: "wm-tooltip-titulo",
					children: h.titulo
				}),
				/* @__PURE__ */ (0, R.jsx)("p", {
					className: "wm-tooltip-valor",
					children: h.valor
				}),
				/* @__PURE__ */ (0, R.jsx)("p", {
					className: "wm-tooltip-fuente",
					children: h.detalle
				})
			] }) : null
		})]
	});
}
// src/ui/Ventaja.tsx
var Ki = 216, qi = {
	arriba: 18,
	derecha: 16,
	abajo: 40,
	izquierda: 64
};
function Ji({ filas: e, periodo: t, indicadorActivo: n, onSeleccionarIndicador: r, onSeleccionar: i }) {
	let [a, o] = wr(260), [s, c] = (0, l.useState)(null), u = Math.max(120, o - qi.izquierda - qi.derecha), d = $n().domain(e.map((e) => e.clave)).range([0, u]).padding(u > 620 ? .76 : .42), f = e.map((e) => e.brecha ?? 0), p = Math.max(.8, ...f.map((e) => Math.abs(e))), m = Math.max(.25, p * .18), h = hr().domain([-p - m, p + m]).range([Ki, 0]), g = (e) => {
		r(e.clave), e.brecha === null ? i({
			titulo: `${e.etiqueta} · ${t}`,
			valor: "No comparable",
			unidad: "puntos porcentuales",
			periodo: t,
			mercado: null,
			base: e.base,
			origen: "publicado",
			formula: null,
			fuente: `walmex-${t.toLowerCase()}`,
			nota: "Falta el dato de uno de los dos mercados en este trimestre: la diferencia no se calcula ni se estima."
		}) : i({
			titulo: `${e.etiqueta} · ventaja entre mercados · ${t}`,
			valor: A(e.brecha),
			unidad: "puntos porcentuales",
			periodo: t,
			mercado: e.brecha >= 0 ? "mexico" : "centroamerica",
			base: e.base,
			origen: "publicado",
			formula: `Tasa de México (${k(e.mexico)}) − tasa de Centroamérica (${k(e.centroamerica)}) = ${A(e.brecha)}`,
			fuente: `walmex-${t.toLowerCase()}`,
			nota: `${e.definicion}. ${e.brecha >= 0 ? "México" : "Centroamérica"} tiene la tasa mayor; una tasa mayor no implica un importe mayor. Base ${ne(e.base)}.`
		});
	};
	return /* @__PURE__ */ (0, R.jsxs)(Cr, {
		testid: "bloque-ventaja",
		titulo: "Ventaja por indicador",
		sub: `${t} · tasa de México − tasa de Centroamérica, en puntos porcentuales`,
		children: [/* @__PURE__ */ (0, R.jsx)("div", {
			className: "wm-grafica",
			ref: a,
			"data-testid": "ventaja-grafica",
			children: o > 0 ? /* @__PURE__ */ (0, R.jsx)("svg", {
				width: o,
				height: Ki + qi.arriba + qi.abajo,
				role: "img",
				"aria-label": `Ventaja por indicador en ${t}: ${e.map((e) => `${e.etiqueta} ${A(e.brecha)}`).join("; ")}.`,
				children: /* @__PURE__ */ (0, R.jsxs)("g", {
					transform: `translate(${qi.izquierda},${qi.arriba})`,
					children: [
						o >= 460 ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)("text", {
							x: u,
							y: 12,
							textAnchor: "end",
							className: "wm-eje-sutil",
							children: "mayor tasa en México ↑"
						}), /* @__PURE__ */ (0, R.jsx)("text", {
							x: u,
							y: 214,
							textAnchor: "end",
							className: "wm-eje-sutil",
							children: "mayor tasa en Centroamérica ↓"
						})] }) : null,
						/* @__PURE__ */ (0, R.jsx)("line", {
							x1: 0,
							x2: u,
							y1: h(0),
							y2: h(0),
							className: "wm-cero-fuerte"
						}),
						h.ticks(4).map((e) => /* @__PURE__ */ (0, R.jsx)("text", {
							x: -10,
							y: h(e) + 3,
							textAnchor: "end",
							className: "wm-eje",
							children: D(e, 1)
						}, `eje-${e}`)),
						e.map((e) => {
							let t = (d(e.clave) ?? 0) + d.bandwidth() / 2, i = e.brecha ?? 0, a = i >= 0, o = Math.max(2, Math.abs(h(i) - h(0))), l = n === e.clave, u = s?.clave === e.clave, f = e.brecha === null ? "#C3CAD8" : a ? S.mexico : S.centroamerica;
							return /* @__PURE__ */ (0, R.jsxs)("g", {
								onMouseEnter: (t) => c({
									x: t.clientX,
									y: t.clientY,
									clave: e.clave
								}),
								onMouseMove: (e) => c((t) => t ? {
									...t,
									x: e.clientX,
									y: e.clientY
								} : null),
								onMouseLeave: () => c(null),
								children: [
									/* @__PURE__ */ (0, R.jsx)("rect", {
										x: d(e.clave),
										y: -qi.arriba + 4,
										width: d.bandwidth(),
										height: 224,
										fill: l || u ? "rgba(52,88,245,0.05)" : "transparent",
										rx: 6
									}),
									e.brecha === null ? /* @__PURE__ */ (0, R.jsx)("rect", {
										x: t - 11,
										y: h(0) - 1,
										width: 22,
										height: 2,
										rx: 1,
										fill: "#C3CAD8",
										strokeDasharray: "2 2"
									}) : /* @__PURE__ */ (0, R.jsx)("rect", {
										x: t - d.bandwidth() / 2,
										y: h(a ? i : 0),
										width: d.bandwidth(),
										height: o,
										rx: 5,
										fill: f,
										opacity: l || u || n === null ? 1 : .55,
										role: "button",
										tabIndex: 0,
										"aria-label": `${e.etiqueta}: ${A(e.brecha)}`,
										onFocus: () => r(e.clave),
										onClick: () => g(e),
										onKeyDown: (t) => {
											(t.key === "Enter" || t.key === " ") && (t.preventDefault(), g(e));
										}
									}),
									/* @__PURE__ */ (0, R.jsx)("text", {
										x: t,
										y: e.brecha === null ? h(0) + 16 : a ? h(i) - 7 : h(i) + 15,
										textAnchor: "middle",
										className: `wm-valor${l ? " is-activo" : ""}`,
										children: e.brecha === null ? "sin par" : A(e.brecha)
									}),
									/* @__PURE__ */ (0, R.jsx)("text", {
										x: t,
										y: 234,
										textAnchor: "middle",
										className: "wm-eje-fuerte",
										children: e.etiqueta
									})
								]
							}, e.clave);
						})
					]
				})
			}) : null
		}), /* @__PURE__ */ (0, R.jsx)(Er, {
			visible: s !== null,
			x: s?.x ?? 0,
			y: s?.y ?? 0,
			testid: "tooltip-ventaja",
			children: s ? (() => {
				let n = e.find((e) => e.clave === s.clave);
				return n ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
					/* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-titulo",
						children: [
							n.etiqueta,
							" · ",
							t
						]
					}),
					/* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-linea",
						children: [
							/* @__PURE__ */ (0, R.jsx)("span", {
								className: "wm-punto-color",
								style: { background: S.mexico }
							}),
							" ",
							"México ",
							/* @__PURE__ */ (0, R.jsx)("strong", { children: k(n.mexico) })
						]
					}),
					/* @__PURE__ */ (0, R.jsxs)("p", {
						className: "wm-tooltip-linea",
						children: [
							/* @__PURE__ */ (0, R.jsx)("span", {
								className: "wm-punto-color",
								style: { background: S.centroamerica }
							}),
							" ",
							"Centroamérica ",
							/* @__PURE__ */ (0, R.jsx)("strong", { children: k(n.centroamerica) })
						]
					}),
					/* @__PURE__ */ (0, R.jsx)("p", {
						className: "wm-tooltip-valor",
						children: n.brecha === null ? "No comparable" : A(n.brecha)
					}),
					/* @__PURE__ */ (0, R.jsx)("p", {
						className: "wm-tooltip-fuente",
						children: n.definicion
					})
				] }) : null;
			})() : null
		})]
	});
}
// src/App.tsx
var Yi = [
	{
		clave: "resumen",
		etiqueta: "Resumen comercial",
		resumen: "Origen del crecimiento, mezcla y calendario"
	},
	{
		clave: "motores",
		etiqueta: "Motores del crecimiento",
		resumen: "Tráfico, ticket y unidades iguales: nivel, ventaja y brecha"
	},
	{
		clave: "comparativa",
		etiqueta: "Comparativa histórica",
		resumen: "Aportación al crecimiento, trayectorias y pulso histórico"
	}
];
function Xi({ apiBase: e }) {
	let t = (0, l.useMemo)(() => y(h(e)), [e]), n = Tr(), [r, i] = (0, l.useState)(null), [a, o] = (0, l.useState)(null), [s, c] = (0, l.useState)(null), [u, d] = (0, l.useState)(null), [f, p] = (0, l.useState)(null), [m, g] = (0, l.useState)(null), [_, v] = (0, l.useState)(null), [b, x] = (0, l.useState)(!1), S = (0, l.useMemo)(() => re(new URL(window.location.href)), []), [C, w] = (0, l.useState)(S.vista), [T, E] = (0, l.useState)(S.desde), [ee, ne] = (0, l.useState)(S.hasta), [j, ie] = (0, l.useState)(S.trimestre), [ce, he] = (0, l.useState)(S.baseIndice), [ge, P] = (0, l.useState)(S.mercado), [ve, be] = (0, l.useState)(S.indicador), [xe, Se] = (0, l.useState)(S.motores ?? "comparar"), [F, Ce] = (0, l.useState)(S.composicion ?? "importe"), [we, Te] = (0, l.useState)(S.estacional ?? "mexico"), [Ee, De] = (0, l.useState)(S.calorMercado ?? "mexico"), [Oe, ke] = (0, l.useState)(null), [Ae, je] = (0, l.useState)(null), [Me, Ne] = (0, l.useState)(null), [Pe, Fe] = (0, l.useState)(!1), Ie = (0, l.useRef)(!1), Le = (0, l.useRef)(!1);
	(0, l.useEffect)(() => {
		let e = new AbortController();
		return Promise.all([t.estado(e.signal), t.catalogo(e.signal)]).then(([e, t]) => {
			i(e), o(t);
		}).catch((e) => {
			e.name !== "AbortError" && c(e.message);
		}), () => e.abort();
	}, [t]), (0, l.useEffect)(() => {
		if (!a?.datos_disponibles || u) return;
		let e = new AbortController();
		return x(!0), t.resumen(M, e.signal).then(d).catch((e) => {
			e.name !== "AbortError" && v(e.message);
		}).finally(() => {
			e.signal.aborted || x(!1);
		}), () => e.abort();
	}, [
		t,
		a,
		u
	]), (0, l.useEffect)(() => {
		if (!a?.datos_disponibles || C !== "motores" || Ie.current) return;
		let e = new AbortController();
		return Ie.current = !0, t.motores(M, e.signal).then(p).catch((e) => {
			e.name !== "AbortError" && v(e.message);
		}), () => e.abort();
	}, [
		t,
		a,
		C
	]), (0, l.useEffect)(() => {
		if (!a?.datos_disponibles || Le.current || C !== "motores" && C !== "comparativa") return;
		let e = new AbortController();
		return Le.current = !0, t.matriz(M, e.signal).then(g).catch((e) => {
			e.name !== "AbortError" && v(e.message);
		}), () => e.abort();
	}, [
		t,
		a,
		C
	]);
	let Re = u?.periodos ?? [], I = (0, l.useMemo)(() => oe(Re, T, ee), [
		Re,
		T,
		ee
	]);
	(0, l.useEffect)(() => {
		if (I.length && (!j || !I.includes(j))) {
			let e = I[I.length - 1];
			j && j !== e && Ne(`El trimestre ${j} quedó fuera del rango visible; se muestra ${e}.`), ie(e);
		}
	}, [I, j]), (0, l.useEffect)(() => {
		I.length && !ce && he(I[0]);
	}, [I, ce]), (0, l.useEffect)(() => {
		ae({
			vista: C,
			desde: T,
			hasta: ee,
			trimestre: j,
			baseIndice: ce,
			indicador: ve,
			base: null,
			mercado: ge,
			motores: xe,
			estacional: we,
			composicion: F,
			calorMercado: Ee,
			calorModo: "tasa"
		});
	}, [
		C,
		T,
		ee,
		j,
		ce,
		ve,
		ge,
		xe,
		we,
		F,
		Ee
	]);
	let ze = (0, l.useCallback)(() => {
		E(null), ne(null), ie(null), he(null), P(null), be(null), je(null), Ne(null), w("resumen"), Se("comparar"), Ce("importe"), Te("mexico"), De("mexico");
	}, []), Be = (0, l.useCallback)(async () => {
		let e = window.location.href;
		try {
			await navigator.clipboard.writeText(e), Fe(!0), window.setTimeout(() => Fe(!1), 2400);
		} catch {
			Ne(`Copia el enlace de la barra de direcciones para compartir: ${e}`);
		}
	}, []), Ve = (0, l.useCallback)((e) => {
		if (!I.length) return;
		let t = Math.max(0, I.indexOf(j ?? I[I.length - 1])), n = Math.max(0, Math.min(I.length - 1, t + e));
		ie(I[n]);
	}, [I, j]), He = (0, l.useMemo)(() => t.urlExportar({
		...M,
		desde: T,
		hasta: ee
	}), [
		t,
		T,
		ee
	]), Ue = (0, l.useMemo)(() => u && j ? de(u.series, Re, j) : null, [
		u,
		Re,
		j
	]), We = (0, l.useMemo)(() => u ? fe(u.series, I) : [], [u, I]), Ge = (0, l.useMemo)(() => u ? pe(u.series, we) : null, [u, we]), Ke = (0, l.useMemo)(() => u ? me(u.series, I) : [], [u, I]), qe = (0, l.useMemo)(() => m && j ? _e(m, j) : [], [m, j]), Je = (0, l.useMemo)(() => N(m, I), [m, I]), Ye = (0, l.useMemo)(() => {
		if (!u || !j) return [];
		let e = (e, t) => u.series.find((t) => t.mercado === e)?.[t].filter((e) => e.valor !== null).map((e) => e.valor) ?? [], t = e("consolidado", "ingresos").slice(-8), n = e("consolidado", "crecimiento").slice(-8), r = I.map((e) => {
			let t = ue(u.series, "mexico", e), n = ue(u.series, "centroamerica", e);
			return t !== null && n !== null ? t - n : null;
		}).filter((e) => e !== null).slice(-8), i = r[r.length - 1] ?? null;
		return [
			{
				clave: "ingresos",
				etiqueta: `Ingresos ${j}`,
				valor: `${O(le(u.series, "consolidado", j))} M`,
				detalle: "millones de pesos nominales",
				serie: t,
				color: "#596273"
			},
			{
				clave: "crecimiento",
				etiqueta: "Crecimiento anual",
				valor: k(ue(u.series, "consolidado", j)),
				detalle: "consolidado, frente al año anterior",
				serie: n,
				color: "#3458F5"
			},
			{
				clave: "brecha",
				etiqueta: "Brecha entre mercados",
				valor: A(i),
				detalle: "crecimiento de México − Centroamérica",
				serie: r,
				color: "#8066E8"
			}
		];
	}, [
		u,
		j,
		I
	]), Xe = (0, l.useMemo)(() => {
		let e = Ue ? ye(Ue) : null, t = null;
		if (j && qe.length && qe.every((e) => e.brecha !== null)) {
			let e = qe.filter((e) => (e.brecha ?? 0) < 0), n = qe.filter((e) => (e.brecha ?? 0) >= 0), r = (e) => e === "trafico" ? "tráfico" : e === "ticket" ? "ticket" : "unidades iguales", i = [];
			e.length && i.push(`Centroamérica tiene la tasa mayor en ${e.map((e) => `${r(e.clave)} (${A(e.brecha)})`).join(" y ")}`), n.length && i.push(`México en ${n.map((e) => `${r(e.clave)} (${A(e.brecha)})`).join(" y ")}`), t = i.length ? `En ${j}, ${i.join("; ")}.` : null;
		}
		let n = Ke.find((e) => e.periodo === j) ?? null, r = n ? `En ${n.periodo} México aportó ${D(n.aporteMexico, 2)} pp y Centroamérica ${D(n.aporteCentroamerica, 2)} pp al crecimiento consolidado; el calculado con importes es ${D(n.crecimientoCalculado, 2)} pp y la tasa publicada ${k(n.crecimientoPublicado)}.` : null;
		return {
			resumen: e,
			motores: t,
			comparativa: r
		};
	}, [
		Ue,
		j,
		qe,
		Ke
	]);
	(0, l.useMemo)(() => j ? se(Re, j) : null, [Re, j]);
	let Ze = (0, l.useMemo)(() => f ? f.paneles.map((e) => ({
		...e,
		puntos: e.puntos.filter((e) => I.includes(e.periodo))
	})) : [], [f, I]), Qe = a?.datos_disponibles === !1 || !!s, $e = Yi.find((e) => e.clave === C), et = C === "resumen" ? Xe.resumen : C === "motores" ? Xe.motores : Xe.comparativa, tt = Yi.findIndex((e) => e.clave === C);
	return /* @__PURE__ */ (0, R.jsxs)("div", {
		className: "wm-app",
		"data-testid": "app",
		"data-disponible": a?.datos_disponibles ? "true" : "false",
		"data-vista": C,
		children: [
			/* @__PURE__ */ (0, R.jsxs)("header", {
				className: "wm-head",
				children: [/* @__PURE__ */ (0, R.jsxs)("div", {
					className: "wm-head-texto",
					children: [
						/* @__PURE__ */ (0, R.jsx)("p", {
							className: "wm-eyebrow",
							children: "Pulso comercial · Walmex"
						}),
						/* @__PURE__ */ (0, R.jsx)("h1", { children: $e?.etiqueta }),
						/* @__PURE__ */ (0, R.jsx)("p", {
							className: "wm-head-sub",
							"data-testid": "periodo-actual",
							children: r?.periodo?.ultimo ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
								$e?.resumen,
								" · último trimestre:",
								" ",
								/* @__PURE__ */ (0, R.jsx)("strong", { children: r.periodo.etiqueta }),
								r.fuente?.ultima_publicacion ? ` (comunicado del ${te(r.fuente.ultima_publicacion)})` : "",
								` · ${r.periodo.trimestres} trimestres publicados`
							] }) : "Cargando la versión publicada…"
						})
					]
				}), /* @__PURE__ */ (0, R.jsxs)("nav", {
					className: "wm-tabs",
					"aria-label": "Vistas del tablero",
					children: [/* @__PURE__ */ (0, R.jsx)("span", {
						className: `wm-tabs-indicador${n ? " sin-movimiento" : ""}`,
						style: {
							width: `${100 / Yi.length}%`,
							transform: `translateX(${tt * 100}%)`
						},
						"aria-hidden": "true"
					}), Yi.map((e) => /* @__PURE__ */ (0, R.jsx)("button", {
						type: "button",
						className: `wm-tab${C === e.clave ? " is-activa" : ""}`,
						"aria-current": C === e.clave ? "page" : void 0,
						title: e.resumen,
						onClick: () => w(e.clave),
						children: e.etiqueta
					}, e.clave))]
				})]
			}),
			/* @__PURE__ */ (0, R.jsxs)("div", {
				className: "wm-barra",
				"data-testid": "barra-controles",
				children: [/* @__PURE__ */ (0, R.jsxs)("div", {
					className: "wm-grupo",
					children: [
						/* @__PURE__ */ (0, R.jsxs)("label", {
							className: "wm-control",
							children: [/* @__PURE__ */ (0, R.jsx)("span", {
								className: "wm-control-label",
								children: "Desde"
							}), /* @__PURE__ */ (0, R.jsxs)("select", {
								value: T ?? "",
								onChange: (e) => E(e.target.value || null),
								children: [/* @__PURE__ */ (0, R.jsx)("option", {
									value: "",
									children: "Primer trimestre"
								}), Re.map((e) => /* @__PURE__ */ (0, R.jsx)("option", {
									value: e,
									children: e
								}, e))]
							})]
						}),
						/* @__PURE__ */ (0, R.jsxs)("label", {
							className: "wm-control",
							children: [/* @__PURE__ */ (0, R.jsx)("span", {
								className: "wm-control-label",
								children: "Hasta"
							}), /* @__PURE__ */ (0, R.jsxs)("select", {
								value: ee ?? "",
								onChange: (e) => ne(e.target.value || null),
								children: [/* @__PURE__ */ (0, R.jsx)("option", {
									value: "",
									children: "Último trimestre"
								}), Re.map((e) => /* @__PURE__ */ (0, R.jsx)("option", {
									value: e,
									children: e
								}, e))]
							})]
						}),
						/* @__PURE__ */ (0, R.jsxs)("div", {
							className: "wm-paso",
							children: [
								/* @__PURE__ */ (0, R.jsx)("button", {
									type: "button",
									className: "wm-paso-btn",
									onClick: () => Ve(-1),
									"aria-label": "Trimestre anterior",
									children: "‹"
								}),
								/* @__PURE__ */ (0, R.jsx)("select", {
									value: j ?? "",
									onChange: (e) => ie(e.target.value || null),
									"aria-label": "Trimestre seleccionado",
									children: I.map((e) => /* @__PURE__ */ (0, R.jsx)("option", {
										value: e,
										children: e
									}, e))
								}),
								/* @__PURE__ */ (0, R.jsx)("button", {
									type: "button",
									className: "wm-paso-btn",
									onClick: () => Ve(1),
									"aria-label": "Trimestre siguiente",
									children: "›"
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, R.jsxs)("div", {
					className: "wm-grupo wm-grupo--derecha",
					children: [
						/* @__PURE__ */ (0, R.jsx)("button", {
							type: "button",
							className: "wm-btn",
							onClick: Be,
							"aria-live": "polite",
							children: Pe ? "Enlace copiado" : "Compartir"
						}),
						/* @__PURE__ */ (0, R.jsx)("a", {
							className: "wm-btn",
							href: He,
							download: !0,
							"data-testid": "exportar",
							children: "Exportar CSV"
						}),
						/* @__PURE__ */ (0, R.jsx)("button", {
							type: "button",
							className: "wm-btn wm-btn--ghost",
							onClick: ze,
							children: "Restablecer"
						})
					]
				})]
			}),
			Me ? /* @__PURE__ */ (0, R.jsxs)("p", {
				className: "wm-aviso-linea",
				role: "status",
				"data-testid": "aviso-ajuste",
				children: [
					Me,
					" ",
					/* @__PURE__ */ (0, R.jsx)("button", {
						type: "button",
						className: "wm-enlace",
						onClick: () => Ne(null),
						children: "entendido"
					})
				]
			}) : null,
			_ ? /* @__PURE__ */ (0, R.jsxs)("div", {
				className: "wm-aviso",
				role: "status",
				children: [/* @__PURE__ */ (0, R.jsx)("p", {
					className: "wm-aviso-titulo",
					children: "No se pudo cargar la vista"
				}), /* @__PURE__ */ (0, R.jsx)("p", { children: _ })]
			}) : null,
			Qe ? /* @__PURE__ */ (0, R.jsxs)("div", {
				className: "wm-aviso",
				role: "status",
				children: [/* @__PURE__ */ (0, R.jsx)("p", {
					className: "wm-aviso-titulo",
					children: "Sin versión publicada"
				}), /* @__PURE__ */ (0, R.jsx)("p", { children: s ?? "La API no encuentra una versión publicada en MongoDB Atlas. El tablero no muestra cifras de ejemplo." })]
			}) : null,
			Qe ? null : /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
				et ? /* @__PURE__ */ (0, R.jsxs)("p", {
					className: "wm-observacion-vista",
					"data-testid": "observacion-vista",
					children: [/* @__PURE__ */ (0, R.jsx)("span", {
						className: "wm-observacion-chip",
						children: j
					}), et]
				}) : null,
				/* @__PURE__ */ (0, R.jsxs)("div", {
					className: `wm-vista${n ? "" : " wm-vista--entra"}`,
					children: [
						C === "resumen" ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
							/* @__PURE__ */ (0, R.jsx)("div", {
								className: "wm-indicadores",
								"data-testid": "kpis",
								children: Ye.map((e) => /* @__PURE__ */ (0, R.jsxs)("article", {
									className: "wm-indicador",
									children: [/* @__PURE__ */ (0, R.jsxs)("div", { children: [
										/* @__PURE__ */ (0, R.jsx)("p", {
											className: "wm-indicador-etiqueta",
											children: e.etiqueta
										}),
										/* @__PURE__ */ (0, R.jsx)("p", {
											className: "wm-indicador-valor",
											children: e.valor
										}),
										/* @__PURE__ */ (0, R.jsx)("p", {
											className: "wm-indicador-detalle",
											children: e.detalle
										})
									] }), /* @__PURE__ */ (0, R.jsx)(Zi, {
										valores: e.serie,
										color: e.color
									})]
								}, e.clave))
							}),
							Ue && u?.datos_disponibles ? /* @__PURE__ */ (0, R.jsx)("div", {
								className: "wm-fila wm-fila--ancha",
								children: /* @__PURE__ */ (0, R.jsx)(Wi, {
									datos: Ue,
									onSeleccionar: je,
									onResaltar: P,
									resaltado: ge
								})
							}) : null,
							/* @__PURE__ */ (0, R.jsxs)("div", {
								className: "wm-fila wm-fila--dos",
								children: [u?.datos_disponibles ? /* @__PURE__ */ (0, R.jsx)(Pi, {
									filas: We,
									periodo: j ?? "",
									modo: F,
									onCambiarModo: Ce,
									onSeleccionarPeriodo: ie,
									onSeleccionar: je,
									resaltado: ge,
									hoverPeriodo: Oe,
									onHoverPeriodo: ke
								}) : null, Ge ? /* @__PURE__ */ (0, R.jsx)(Pr, {
									datos: Ge,
									mercado: we,
									onCambiarMercado: Te,
									periodo: j ?? "",
									onSeleccionarPeriodo: ie,
									onSeleccionar: je,
									hoverPeriodo: Oe
								}) : null]
							})
						] }) : null,
						C === "motores" ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [Ze.length ? /* @__PURE__ */ (0, R.jsx)("div", {
							className: "wm-fila wm-fila--ancha",
							children: /* @__PURE__ */ (0, R.jsx)(Bi, {
								paneles: Ze,
								periodos: Re,
								seleccionado: j,
								vista: xe,
								onCambiarVista: Se,
								onSeleccionarPeriodo: ie,
								onSeleccionar: je,
								cobertura: Ze.reduce((e, t) => Math.max(e, t.puntos.length), 0)
							})
						}) : /* @__PURE__ */ (0, R.jsx)("p", {
							className: "wm-vacio",
							children: b ? "Calculando…" : "Sin datos de motores."
						}), m?.datos_disponibles && j ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)("div", {
							className: "wm-fila wm-fila--ancha",
							children: /* @__PURE__ */ (0, R.jsx)(Ji, {
								filas: qe,
								periodo: j,
								indicadorActivo: ve,
								onSeleccionarIndicador: be,
								onSeleccionar: je
							})
						}), /* @__PURE__ */ (0, R.jsx)("div", {
							className: "wm-fila wm-fila--ancha",
							children: /* @__PURE__ */ (0, R.jsx)(jr, {
								brechas: Je,
								periodos: I,
								periodo: j,
								indicadorActivo: ve,
								onSeleccionarPeriodo: ie,
								onSeleccionar: je,
								onSeleccionarIndicador: be
							})
						})] }) : /* @__PURE__ */ (0, R.jsx)("p", {
							className: "wm-vacio",
							children: b ? "Calculando…" : "Sin matriz de indicadores."
						})] }) : null,
						C === "comparativa" ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
							u?.datos_disponibles ? /* @__PURE__ */ (0, R.jsx)("div", {
								className: "wm-fila wm-fila--ancha",
								children: /* @__PURE__ */ (0, R.jsx)(Rr, {
									columnas: Ke,
									periodo: j ?? "",
									onSeleccionarPeriodo: ie,
									onSeleccionar: je
								})
							}) : null,
							u?.datos_disponibles && ce ? /* @__PURE__ */ (0, R.jsx)("div", {
								className: "wm-fila wm-fila--ancha",
								children: /* @__PURE__ */ (0, R.jsx)(ji, {
									series: u.series,
									periodos: I,
									todos: Re,
									base: ce,
									onCambiarBase: he,
									onSeleccionarPeriodo: ie,
									onSeleccionar: je,
									seleccionado: j
								})
							}) : null,
							/* @__PURE__ */ (0, R.jsx)("div", {
								className: "wm-fila wm-fila--ancha",
								children: m?.datos_disponibles && j ? /* @__PURE__ */ (0, R.jsx)(Gi, {
									matriz: m,
									mercado: Ee,
									onCambiarMercado: De,
									periodos: I,
									periodo: j,
									onSeleccionarPeriodo: ie,
									onSeleccionar: je,
									indicadorActivo: ve,
									onSeleccionarIndicador: be,
									hoverPeriodo: Oe
								}) : null
							})
						] }) : null
					]
				}, C),
				/* @__PURE__ */ (0, R.jsx)(Fr, {
					dato: Ae,
					onCerrar: () => je(null),
					onLimpiarMercado: () => P(null)
				}),
				/* @__PURE__ */ (0, R.jsx)(Qi, {
					resumen: u,
					visibles: I,
					matriz: m,
					periodo: j
				}),
				/* @__PURE__ */ (0, R.jsx)($i, { estado: r })
			] })
		]
	});
}
function Zi({ valores: e, color: t }) {
	if (e.length < 2) return null;
	let n = Math.min(...e), r = Math.max(...e) - n || 1, i = e.map((t, i) => {
		let a = i / (e.length - 1) * 68, o = 24 - (t - n) / r * 20 - 2;
		return `${i === 0 ? "M" : "L"}${a.toFixed(1)},${o.toFixed(1)}`;
	}), a = 24 - (e[e.length - 1] - n) / r * 20 - 2;
	return /* @__PURE__ */ (0, R.jsxs)("svg", {
		className: "wm-spark",
		width: 68,
		height: 24,
		"aria-hidden": "true",
		children: [/* @__PURE__ */ (0, R.jsx)("path", {
			d: i.join(" "),
			fill: "none",
			stroke: t,
			strokeWidth: 1.6,
			strokeLinecap: "round"
		}), /* @__PURE__ */ (0, R.jsx)("circle", {
			cx: 68,
			cy: a,
			r: 2.4,
			fill: t
		})]
	});
}
function Qi({ resumen: e, visibles: t, matriz: n, periodo: r }) {
	return e?.datos_disponibles ? /* @__PURE__ */ (0, R.jsxs)("details", {
		className: "wm-detalle-tecnico",
		"data-testid": "tabla-accesible",
		children: [
			/* @__PURE__ */ (0, R.jsx)("summary", { children: "Ver los datos como tabla accesible" }),
			/* @__PURE__ */ (0, R.jsx)("div", {
				className: "wm-tabla-caja",
				children: /* @__PURE__ */ (0, R.jsxs)("table", {
					className: "wm-tabla",
					children: [
						/* @__PURE__ */ (0, R.jsx)("caption", { children: "Ingresos, año anterior y crecimiento anual por trimestre y mercado" }),
						/* @__PURE__ */ (0, R.jsx)("thead", { children: /* @__PURE__ */ (0, R.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, R.jsx)("th", {
								scope: "col",
								children: "Mercado"
							}),
							/* @__PURE__ */ (0, R.jsx)("th", {
								scope: "col",
								children: "Trimestre"
							}),
							/* @__PURE__ */ (0, R.jsx)("th", {
								scope: "col",
								className: "wm-num",
								children: "Ingresos (M MXN)"
							}),
							/* @__PURE__ */ (0, R.jsx)("th", {
								scope: "col",
								className: "wm-num",
								children: "Año anterior (M MXN)"
							}),
							/* @__PURE__ */ (0, R.jsx)("th", {
								scope: "col",
								className: "wm-num",
								children: "Crecimiento"
							})
						] }) }),
						/* @__PURE__ */ (0, R.jsx)("tbody", { children: e.series.filter((e) => e.mercado !== "consolidado").flatMap((e) => e.ingresos.filter((e) => t.includes(e.periodo)).map((t) => /* @__PURE__ */ (0, R.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, R.jsx)("th", {
								scope: "row",
								children: e.etiqueta
							}),
							/* @__PURE__ */ (0, R.jsx)("td", { children: t.periodo }),
							/* @__PURE__ */ (0, R.jsx)("td", {
								className: "wm-num",
								children: O(t.valor)
							}),
							/* @__PURE__ */ (0, R.jsx)("td", {
								className: "wm-num",
								children: O(e.ingresos_anio_anterior?.find((e) => e.periodo === t.periodo)?.valor)
							}),
							/* @__PURE__ */ (0, R.jsx)("td", {
								className: "wm-num",
								children: k(e.crecimiento.find((e) => e.periodo === t.periodo)?.valor)
							})
						] }, `${e.mercado}-${t.periodo}`))) })
					]
				})
			}),
			n?.datos_disponibles && r ? /* @__PURE__ */ (0, R.jsx)("div", {
				className: "wm-tabla-caja",
				children: /* @__PURE__ */ (0, R.jsxs)("table", {
					className: "wm-tabla",
					children: [
						/* @__PURE__ */ (0, R.jsxs)("caption", { children: [
							"Indicadores de variación del ",
							r,
							" por mercado, con base y origen de cada cifra"
						] }),
						/* @__PURE__ */ (0, R.jsx)("thead", { children: /* @__PURE__ */ (0, R.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, R.jsx)("th", {
								scope: "col",
								children: "Indicador"
							}),
							/* @__PURE__ */ (0, R.jsx)("th", {
								scope: "col",
								children: "Base"
							}),
							/* @__PURE__ */ (0, R.jsx)("th", {
								scope: "col",
								children: "Mercado"
							}),
							/* @__PURE__ */ (0, R.jsx)("th", {
								scope: "col",
								className: "wm-num",
								children: "Valor"
							}),
							/* @__PURE__ */ (0, R.jsx)("th", {
								scope: "col",
								children: "Origen"
							}),
							/* @__PURE__ */ (0, R.jsx)("th", {
								scope: "col",
								children: "Fuente"
							})
						] }) }),
						/* @__PURE__ */ (0, R.jsx)("tbody", { children: n.celdas.filter((e) => e.periodo === r).map((e) => {
							let t = n.indicadores.find((t) => t.clave === e.indicador), r = n.mercados.find((t) => t.clave === e.mercado);
							return /* @__PURE__ */ (0, R.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, R.jsx)("th", {
									scope: "row",
									children: t?.etiqueta ?? e.indicador
								}),
								/* @__PURE__ */ (0, R.jsx)("td", { children: r?.etiqueta ?? e.mercado }),
								/* @__PURE__ */ (0, R.jsx)("td", { children: e.base ?? "—" }),
								/* @__PURE__ */ (0, R.jsx)("td", {
									className: "wm-num",
									children: e.valor === null ? "No publicado" : k(e.valor)
								}),
								/* @__PURE__ */ (0, R.jsx)("td", { children: e.valor === null ? "—" : e.derivado ? "Derivado" : "Publicado" }),
								/* @__PURE__ */ (0, R.jsx)("td", { children: e.fuente ?? "—" })
							] }, `${e.indicador}-${e.mercado}`);
						}) })
					]
				})
			}) : null
		]
	}) : null;
}
function $i({ estado: e }) {
	return /* @__PURE__ */ (0, R.jsxs)("details", {
		className: "wm-detalle-tecnico",
		"data-testid": "metodo",
		children: [/* @__PURE__ */ (0, R.jsx)("summary", { children: "Fuente, método y límites" }), /* @__PURE__ */ (0, R.jsxs)("div", {
			className: "wm-metodo",
			children: [
				/* @__PURE__ */ (0, R.jsxs)("p", { children: [
					/* @__PURE__ */ (0, R.jsx)("strong", { children: "Fuente." }),
					" Comunicados trimestrales y «Estados Financieros» de Walmart de México y Centroamérica en",
					" ",
					/* @__PURE__ */ (0, R.jsx)("a", {
						href: "https://www.walmex.mx/comunicados-y-eventos/comunicados-a-bmv.html",
						target: "_blank",
						rel: "noreferrer",
						children: "walmex.mx"
					}),
					". Cada cifra conserva su documento de origen."
				] }),
				/* @__PURE__ */ (0, R.jsxs)("p", { children: [/* @__PURE__ */ (0, R.jsx)("strong", { children: "Consolidado." }), " México y Centroamérica lo componen: no es un tercer mercado. El puente de Resumen comprueba ΔConsolidado = ΔMéxico + ΔCentroamérica + residual, con una tolerancia de 1 millón por el redondeo de la fuente; el residual se muestra cuando existe."] }),
				/* @__PURE__ */ (0, R.jsxs)("p", { children: [/* @__PURE__ */ (0, R.jsx)("strong", { children: "Contribuciones." }), " Aportación = (ingreso del mercado en t − ingreso del mismo mercado en t−4) ÷ ingreso consolidado de t−4 × 100. Todas usan el mismo denominador; no son las tasas de crecimiento de cada mercado."] }),
				/* @__PURE__ */ (0, R.jsxs)("p", { children: [/* @__PURE__ */ (0, R.jsx)("strong", { children: "Índice." }), " importe(t) ÷ importe(base) × 100, con base común, comparable y mayor que cero, elegida sobre la línea temporal. Mover el rango no la cambia y se avisa si queda fuera. Compara niveles nominales: no es crecimiento real y arrastra estacionalidad."] }),
				/* @__PURE__ */ (0, R.jsxs)("p", { children: [/* @__PURE__ */ (0, R.jsx)("strong", { children: "Motores." }), " Tráfico, ticket y unidades iguales son variaciones publicadas; sus diferencias se expresan en puntos porcentuales y no se suman ni descomponen el crecimiento. Las brechas unen trimestres de forma lineal: el cruce por cero no es una fecha observada."] }),
				/* @__PURE__ */ (0, R.jsxs)("p", { children: [/* @__PURE__ */ (0, R.jsx)("strong", { children: "Ausencias." }), " Un dato no publicado se muestra como ausencia (hueco, «—», celda vacía), nunca como cero, y no se interpola. Las series conservan todos los trimestres del eje temporal."] }),
				/* @__PURE__ */ (0, R.jsxs)("p", { children: [/* @__PURE__ */ (0, R.jsx)("strong", { children: "Lo que no está." }), " Sin detalle por tienda, formato, producto, estado ni cliente; sin metas de la empresa; sin comercio electrónico (definición cambiante entre trimestres)."] }),
				/* @__PURE__ */ (0, R.jsxs)("p", { children: [
					/* @__PURE__ */ (0, R.jsx)("strong", { children: "Versión." }),
					" ",
					e?.version ?? "sin publicar",
					" · modelo ",
					e?.modelo ?? "—",
					" · publicado ",
					e?.publicacion?.publicado_en ?? "—",
					" · persistencia MongoDB Atlas",
					e?.periodo?.desde && e?.periodo?.hasta ? ` · cobertura ${e.periodo.desde} – ${e.periodo.hasta}` : "",
					"."
				] })
			]
		})]
	});
}
// src/hallazgos.ts
function ea(e) {
	return Math.round(e).toLocaleString("es-MX").replace(/,/g, "\xA0");
}
function ta(e) {
	return `${D(e, 1).replace(".", ",")} %`;
}
function na(e) {
	return `${D(Math.round(e * 10) / 10, 1).replace(".", ",")} puntos porcentuales`;
}
var ra = [
	"primer",
	"segundo",
	"tercer",
	"cuarto"
];
function ia(e) {
	let t = /^(\d)T(\d{2})$/.exec(e);
	return t ? `${ra[Number(t[1]) - 1] ?? `${t[1]}º`} trimestre de 20${t[2]}` : e;
}
function z(e, t) {
	return Math.abs(e) < .05 ? `${t} permanece estable` : `${t} ${e > 0 ? "aumenta" : "cae"} ${ta(Math.abs(e))}`;
}
function B(e) {
	let { resumen: t, motores: n, desempeno: r } = e, i = [], a = [], o = t.periodos ?? [], s = o[o.length - 1], c = s ? Number(s.slice(-2)) - 1 : null, l = s ? `Resultados del ${ia(s)} frente al mismo trimestre de 20${c}.` : "Resultados del último trimestre publicado frente al mismo trimestre del año anterior.", u = (e) => t.series.find((t) => t.mercado === e), d = (e, t, n) => {
		let r = u(e);
		return r ? r[t].find((e) => e.periodo === n)?.valor ?? null : null;
	}, f = (e, t) => {
		let n = u(e)?.ingresos_anio_anterior?.find((e) => e.periodo === t)?.valor ?? null;
		if (n != null) return n;
		let r = o.indexOf(t);
		return r < 4 ? null : d(e, "ingresos", o[r - 4]);
	};
	if (s) {
		let e = d("mexico", "ingresos", s), t = d("centroamerica", "ingresos", s), n = f("mexico", s), r = f("centroamerica", s);
		if (e !== null && t !== null && n !== null && r !== null) {
			let o = e - n, s = t - r, c = o + s;
			if (c > 0) {
				let e = 100 * o / c, t = 100 * s / c, n = e >= t ? {
					lider: "México",
					seguidor: "Centroamérica",
					parte: e,
					resto: t
				} : {
					lider: "Centroamérica",
					seguidor: "México",
					parte: t,
					resto: e
				};
				i.push({
					id: "reparto",
					titulo: `${n.lider} concentra el aumento de ingresos`,
					texto: `Aporta el ${ta(n.parte)} del incremento consolidado de ${ea(c)} millones de pesos; ${n.seguidor} contribuye con el ${ta(n.resto)} restante.`,
					enfasis: [ta(n.parte)]
				});
			} else a.push("reparto: el incremento del trimestre no es positivo");
		} else a.push("reparto: faltan importes por mercado en el último trimestre");
	}
	let p = n.paneles.find((e) => e.mercado === "mexico"), m = n.paneles.find((e) => e.mercado === "centroamerica"), h = p?.puntos[p.puntos.length - 1] ?? null, g = m?.puntos[m.puntos.length - 1] ?? null;
	if (h && g && h.periodo === g.periodo) {
		if (!s || h.periodo === s) {
			let e = [];
			Math.abs(h.ticket) >= .05 && e.push(ta(Math.abs(h.ticket))), Math.abs(g.trafico) >= .05 && e.push(ta(Math.abs(g.trafico)));
			let t = g.trafico > .05 && g.ticket > .05 ? `En Centroamérica crecen tanto el tráfico (${ta(g.trafico)}) como el ticket (${ta(g.ticket)}).` : `En Centroamérica ${z(g.trafico, "el tráfico")} y ${z(g.ticket, "el ticket")}.`;
			i.push({
				id: "mercados",
				titulo: "Los mercados presentan patrones distintos",
				texto: `En México, ${z(h.trafico, "el tráfico")} y ${z(h.ticket, "el ticket")}. ${t}`,
				enfasis: e
			});
		} else a.push("mercados: tráfico y ticket no cubren el último trimestre publicado");
	} else a.push("mercados: faltan tráfico o ticket del último trimestre con datos");
	if (s) {
		let e = (e) => r.filas.find((t) => t.mercado === e)?.celdas.find((e) => e.periodo === s)?.valor ?? null, t = e("mexico"), n = e("centroamerica");
		if (t !== null && n !== null) {
			let e = n - t;
			e > .05 ? i.push({
				id: "unidades-iguales",
				titulo: "Centroamérica destaca en ventas a unidades iguales",
				texto: `Registra un crecimiento de ${ta(n)}, frente al ${ta(t)} de México: una diferencia de ${na(e)}.`,
				enfasis: [ta(n), na(e)]
			}) : a.push("unidades iguales: Centroamérica no supera a México en el trimestre");
		} else a.push("unidades iguales: falta el dato comparable del último trimestre");
	}
	return {
		subtitulo: l,
		hallazgos: i,
		omitidos: a
	};
}
// src/ui/Hallazgos.tsx
var aa = {
	cargando: !0,
	error: null,
	subtitulo: "",
	hallazgos: [],
	omitidos: []
};
function oa(e) {
	return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function sa(e, t) {
	let n = t.filter((t) => t && e.includes(t));
	if (!n.length) return e;
	let r = RegExp(`(${n.map(oa).join("|")})`, "g");
	return e.split(r).map((e, t) => n.includes(e) ? /* @__PURE__ */ (0, R.jsx)("strong", {
		className: "hallazgo-cifra",
		children: e
	}, `${e}-${t}`) : /* @__PURE__ */ (0, R.jsx)(l.Fragment, { children: e }, `texto-${t}`));
}
function ca({ apiBase: e }) {
	let [t, n] = (0, l.useState)(aa);
	return (0, l.useEffect)(() => {
		let t = new AbortController(), r = y(h(e));
		return Promise.all([
			r.resumen(M, t.signal),
			r.motores(M, t.signal),
			r.desempeno({
				...M,
				indicador: "mismas_tiendas"
			}, t.signal)
		]).then(([e, r, i]) => {
			if (t.signal.aborted) return;
			let a = B({
				resumen: e,
				motores: r,
				desempeno: i
			});
			n({
				cargando: !1,
				error: null,
				subtitulo: a.subtitulo,
				hallazgos: a.hallazgos,
				omitidos: a.omitidos
			});
		}).catch((e) => {
			e.name !== "AbortError" && n({
				...aa,
				cargando: !1,
				error: "No se pudieron calcular los hallazgos: la API de Walmex no respondió. El tablero sigue funcionando con los datos publicados."
			});
		}), () => t.abort();
	}, [e]), t.cargando ? /* @__PURE__ */ (0, R.jsx)("p", {
		className: "hallazgos-espera",
		children: "Calculando hallazgos con los datos publicados…"
	}) : t.error ? /* @__PURE__ */ (0, R.jsx)("p", {
		className: "hallazgos-espera",
		role: "status",
		"data-testid": "hallazgos-error",
		children: t.error
	}) : t.hallazgos.length ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)("p", {
		className: "hallazgos-alcance",
		"data-testid": "hallazgos-alcance",
		children: t.subtitulo
	}), t.hallazgos.map((e) => /* @__PURE__ */ (0, R.jsxs)("p", {
		"data-testid": `hallazgo-${e.id}`,
		children: [
			/* @__PURE__ */ (0, R.jsxs)("strong", {
				className: "hallazgo-titulo",
				children: [e.titulo, "."]
			}),
			" ",
			sa(e.texto, e.enfasis)
		]
	}, e.id))] }) : /* @__PURE__ */ (0, R.jsx)("p", {
		className: "hallazgos-espera",
		role: "status",
		children: "Todavía no hay cifras publicadas suficientes para redactar hallazgos."
	});
}
// src/mount.tsx
var la = null, ua = null, da = null, fa = null, pa = null, ma = null;
function ha() {
	la && (la.unmount(), la = null), ua && ua.parentNode && ua.parentNode.removeChild(ua), ua = null, pa?.disconnect(), pa = null, ma !== null && (window.clearTimeout(ma), ma = null), da && (da.unmount(), da = null), fa && (fa.textContent = "", fa = null);
}
function ga() {
	let e = [...document.querySelectorAll(".wm-kpi-valor")];
	return e.length > 0 && e.some((e) => !(e.textContent ?? "").includes("No publicado"));
}
function _a(e) {
	let t = document.getElementById("hallazgos-host");
	if (!t) return;
	let n = () => {
		pa?.disconnect(), pa = null, ma !== null && (window.clearTimeout(ma), ma = null), t.isConnected && (t.textContent = "", fa = t, da = (0, u.createRoot)(t), da.render(/* @__PURE__ */ (0, R.jsx)(ca, { apiBase: e })));
	};
	ga() ? n() : (pa = new MutationObserver(() => {
		ga() && n();
	}), pa.observe(document.body, {
		childList: !0,
		subtree: !0,
		characterData: !0
	}), ma = window.setTimeout(n, 6e3));
}
function va(e, t = {}) {
	return ha(), ua = document.createElement("div"), ua.className = "wm-root", e.appendChild(ua), la = (0, u.createRoot)(ua), la.render(/* @__PURE__ */ (0, R.jsx)(Xi, { apiBase: t.apiBase })), _a(t.apiBase), {
		unmount: ha,
		resize: () => void 0
	};
}
var ya = {
	mount: va,
	unmount: ha
};
export { ya as default, va as mount, ha as unmount };
