/*jshint eqnull: true, browser: true, latedef: false */
'use strict';

var detect = require('type'),
    each = require('each'),
    extend = require('extend'),
    Promise = require('event').Promise,
    id = 0,
    slice = Array.prototype.slice,
    defaults = {
        type: 'get',
        dataType: 'json',
        async: true,
        timeout: 0,
        username: null,
        password: null
    },
    jsonp,
    ajax,
    param;

function empty() {}

function bind(func, context) {
    var args = slice.call(arguments, 2);
    return function () {
        return func.apply(context, args.concat(slice.call(arguments)));
    };
}

exports.ping = function (url, params) {
    var img = new Image();
    params = extend({
        _tm: +new Date()
    }, params);
    img.src = param(params, url);
};

each(['get', 'post', 'put', 'delete'], function (m) {
    exports[m] = function () {
        return ajax(extend(createOptions(arguments), {type: m}));
    };
});

exports.getJSON = function () {
    return ajax(extend(createOptions(arguments), {dataType: 'json'}));
};

exports.getXML = function () {
    return ajax(extend(createOptions(arguments), {dataType: 'xml'}));
};

exports.sendForm = function () {
    var fd, options,
        f = arguments[0],
        params = slice.call(arguments, 1);

    if (f && f.nodeName === 'FORM') {
        fd = new FormData(f);
        params.unshift(f.action || location.href);

        options = extend(createOptions(params), {
            type: f.method || 'post',
            data: fd
        });
        return ajax(options);
    } else {
        throw new Error('HTMLFormElement expected');
    }
};

exports.sendFile = function () {
    var options = createOptions(arguments);
    return ajax(extend(options, {
        type: 'post',
        headers: {'X-File-Name': options.data.name}
    }));
};

jsonp = exports.jsonp = function () {
    var options = createOptions(arguments),
        xhr = {
            id: ++id
        },
        callbackName = 'elf_jsonp_' + xhr.id,
        script = document.createElement('script'),
        settings = xhr.ajaxSettings = extend({}, defaults, options),
        url = settings.url,
        promise = xhr.promise = new Promise(),
        oldAlways = promise.always;

    // 处理 xhr 对象，加入 promise 模式支持
    promise.always = function (fn) {
        oldAlways.call(promise, function () {
            fn(xhr);
        });
    };

    each(['done', 'fail', 'always', 'resolve', 'reject'], function (m) {
        xhr[m] = bind(promise[m], promise);
    });

    // 清理 JSONP Callback 函数
    xhr.abort = function () {
        if(script && script.parentNode) {
            script.parentNode.removeChild(script);
        }
        if (callbackName in window) {
            window[callbackName] = null;
        }
        try {
            delete window[callbackName];
        } catch (e) {}
    };

    // JSONP Callback
    window[callbackName] = function (data) {
        clearTimeout(settings._timeoutTimer);
        xhr.abort();
        success(xhr, data);
    };

    // 处理 error
    script.onerror = function () {
        xhr.abort();
        error(xhr);
    };

    // 处理 timeout
    if (settings.timeout > 0) {
        settings._timeoutTimer = setTimeout(function () {
            xhr.abort();
            error(xhr, 'timeout');
        }, settings.timeout * 1000);
    }

    url = param(settings.data, url);
    if (!(/[&?]callback=/.test(url))) {
        url = url + (url.indexOf('?') < 0 ? '?' : '&') + 'callback=?';
    }
    script.src = url.replace('=?', '=' + callbackName);
    document.head.appendChild(script);
    return xhr;
};

ajax = exports.ajax = function (options) {
    if (options.dataType === 'jsonp') {
        return jsonp(options);
    }

    var xhr = new XMLHttpRequest(),
        upload = xhr.upload,
        tmp,
        settings = extend({}, defaults, options),
        type = settings.type = settings.type.toLowerCase(),
        data = settings.data,
        hasParam = false,
        progress = settings.progress,
        promise,
        oldAlways;

    // 处理 xhr 对象，加入 promise 模式支持
    xhr.id = ++id;
    promise = xhr.promise = new Promise();
    oldAlways = promise.always;
    promise.always = function (fn) {
        oldAlways.call(promise, function () {
            fn(xhr);
        });
    };
    each(['done', 'fail', 'always', 'resolve', 'reject'], function (m) {
        xhr[m] = bind(promise[m], promise);
    });

    // 处理 options.data
    each(data, function () {
        hasParam = true;
    });

    if (!hasParam && detect(data) !== 'string') {
        delete settings.data;
        data = settings.data;
    }

    if (typeof data === 'object' &&
        detect(data) !== 'formdata' &&
        detect(data) !== 'file') {

        if (type === 'get') {
            settings.url = param(data, settings.url);
            data = settings.data = null;
        } else {
            tmp = new FormData();
            each(data, function (value, key) {
                tmp.append(key,
                    detect(value) === 'array' ? value.join() : value);
            });
            data = settings.data = tmp;
        }
    }

    // 处理 progress 事件
    if (typeof progress === 'function') {
        upload.callback = progress;
        upload.onprogress = onProgress;
    }

    // 处理 timeout
    if (settings.timeout > 0) {
        settings._timeoutTimer = setTimeout(function () {
            xhr.onreadystatechange = empty;
            xhr.abort();
            error(xhr, 'timeout');
            xhr = null;
        }, settings.timeout * 1000);
    }

    xhr.open(type, settings.url, settings.async,
        settings.username, settings.password);

    addHeaders(xhr, settings.dataType, settings.headers);
    xhr.ajaxSettings = settings;
    xhr.onreadystatechange = onReadyStateChange;
    xhr.onerror = function () {
        return error(xhr);
    };

    xhr.send(data);
    return xhr;
};

// 序列化对象 {a: 1, b: 2, c: 'd e'} 为 'a=1&b=2&c=d+e' 形式的 querystring
// 若指定 appendTo，则将 appendTo 视为 url，并返回追加 querystring 后的 url
// 否则直接返回 querystring
param = exports.param = function (data, appendTo) {
    var stack = [],
        query;

    each(data, function (value, key) {
        stack.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    });
    query = stack.join('&').replace(/%20/g, '+');

    if (typeof appendTo === 'string') {
        query = appendTo + (query.length > 0 ?
            (appendTo.indexOf('?') < 0 ? '?' : '&') + query :
            '');
    }

    return query;
};

// 设置默认选项
exports.setDefaultOptions = function (options) {
    each(options, function (value, key) {
        switch (key) {
        case 'success':
            exports.setDefaultSuccess(value);
            break;
        case 'error':
            exports.setDefaultError(value);
            break;
        default:
            defaults[key] = value;
        }
    });
    return this;
};

// 设置默认成功处理函数
exports.setDefaultSuccess = function (onSuccess) {
    defaults.onSuccess =
        typeof onSuccess === 'function' ? onSuccess : null;
    return this;
};

// 设置默认错误处理函数
exports.setDefaultError = function (onError) {
    defaults.onError = typeof onError === 'function' ? onError :
        function (e) {
            throw e;
        };
    return this;
};

// readystatechange 事件处理函数
function onReadyStateChange(e) {
    var xhr = e.target,
        settings = xhr.ajaxSettings || {},
        dataType = settings.dataType,
        status,
        resText,
        resBody;

    if (xhr.readyState === xhr.DONE) {
        status = xhr.status;
        resText = xhr.responseText;

        if (settings._timeoutTimer) {
            clearTimeout(settings._timeoutTimer);
        }

        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
            switch (dataType.toLowerCase()) {
            case 'json':
                try {
                    resBody = JSON.parse(resText);
                } catch (err) {
                    return error(xhr, err.message);
                }
                break;
            case 'xml':
                resBody = xhr.responseXML;
                break;
            default:
                resBody = resText;
            }
            success(xhr, resBody);
        } else {
            error(xhr);
        }
    }
}

// 上传 progress 事件处理函数
function onProgress(e) {
    if (e && e.lengthComputable) {
        e.target.callback.call(e, Math.round(e.loaded / e.total));
    }
}

// 创建 options
function createOptions(args) {
    var p,
        options = {
            url: args[0]
        },
        params = slice.call(args, 1),
        foundCallBack = false,
        foundData = false;

    while (params.length) {
        p = params.shift();
        switch (typeof p) {
        case 'string':
            options.data = p;
            foundData = true;
            break;
        case 'function':
            if (foundCallBack) {
                options.error = p;
            } else {
                options.success = p;
                foundCallBack = true;
            }
            break;
        case 'object':
            if (foundData) {
                extend(options, p);
            } else {
                options.data = p;
                foundData = true;
            }
        }
    }

    return options;
}

// 根据 dataType 为 xhr 对象添加 Accept 头部，可通过指定 headers 添加自定义头部
function addHeaders(xhr, dataType, headers) {
    var accept;
    switch ((dataType || '').toLowerCase()) {
    case 'html':
        accept = 'text/html';
        break;
    case 'xml':
        accept = 'text/xml';
        break;
    case 'script':
        accept = 'text/javascript, application/javascript';
        break;
    case 'text':
        accept = 'text/plain';
        break;
    // 默认为 JSON
    //case 'json':
    default:
        accept = 'application/json, text/javascript';
    }
    accept += ', */*;q=0.01';
    xhr.setRequestHeader('Accept', accept);

    if (typeof headers === 'object') {
        each(headers, function (value, key) {
            xhr.setRequestHeader(key, value);
        });
    }
}

function success(xhr, data) {
    var args = [data, xhr.status, xhr];
    getSuccess(xhr).apply(xhr, args);
    xhr.resolve.apply(xhr, args);
}

function error(xhr, msg) {
    if (xhr._aborted) return;
    var handler = getError(xhr),
        args;
    msg = typeof msg === 'string' ? msg : xhr.statusText;
    args = [xhr, msg, xhr.status];
    handler.apply(xhr, args);
    xhr.reject.apply(xhr, args);
    xhr._aborted = true;
}

// 返回错误处理函数
function getError(xhr) {
    var settings = xhr.ajaxSettings;
    if (settings && typeof settings.error === 'function') {
        return settings.error;
    }
    return defaults.onError || empty;
}

// 返回成功处理函数
function getSuccess(xhr) {
    var settings = xhr.ajaxSettings;
    if (settings && typeof settings.success === 'function') {
        return settings.success;
    }
    return defaults.onSuccess || empty;
}