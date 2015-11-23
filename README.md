network (DEPRECIATED use [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) instead)
=======

network 模块返回一个对象，提供了一系列发送 AJAX 请求的方法和配置。

### network.ping(url, params)

伪造一个图片请求去请求 url，并传递相关参数，用于实现无需得到响应的简单请求，如记录前端统计日志、错误日志等。

``` javascript
var net = require('network');
window.onerror = function (msg, file, line) {
    net.ping('/api/error', {
        ua: navigator.userAgent.toLowerCase(),
        ref: document.referrer,
        url: location.href,
        file: file || '',
        line: line || 0,
        msg: msg || ''
    });
};
```

### network.get(url, [params], onSuccess, [onError], [options])

发出一个 AJAX GET 请求，请求 JSON 数据，可指定请求成功与失败的处理函数，并返回一个 promise 对象。

``` javascript
var net = require('network');
net.get('/api/update', {
    id: 12,
    name: 'Elf'
}, function (data, status, xhr) {
    // 成功的回调函数
}, function (xhr, errorType, status) {
    // 失败的回调函数
});
```

关于 promise 对象的使用，参见 `network.ajax`。

### network.post(url, [params], onSuccess, [onError], [options])

发出一个 AJAX POST 请求，请求 JSON 数据，参数同 `network.get`，返回一个 promise 对象。

关于 promise 对象的使用，参见 `network.ajax`。

### network.jsonp(url, [params], onSuccess, [onError], [options])

通过 [JSONP](http://en.wikipedia.org/wiki/JSONP) 发出一个可跨域 GET 请求，参数同 `network.get`，返回一个 promise 对象。

关于 promise 对象的使用，参见 `network.ajax`。

### network.sendForm(form, onSuccess, [onError], [options])

通过 AJAX POST 请求发送表单，可指定请求成功与失败的处理函数，返回一个 promise 对象。

``` javascript
var $ = require('zepto'),
    net = require('network'),
    form = $('FORM[name="example"]')[0];

net.sendForm(form, function (data, status, xhr) {
    // 成功的回调函数
}, function (xhr, errorType, status) {
    // 失败的回调函数
});
```

__注意__ `network.sendForm` 方法的第一个参数 form 需指定要提交的 HTMLFormElement。

关于 promise 对象的使用，参见 `network.ajax`。

### network.sendFile(url, file, onSuccess, [onError], [options])

通过 AJAX POST 请求发送文件，可指定请求成功与失败的处理函数，返回一个 promise 对象。

``` html
<form action="" method="POST">
  <input type="file" name="upload" multiple>
</form>```

``` javascript
var $ = require('zepto'),
    net = require('network'),
    input = $('INPUT[name="upload"]')[0],
    file = input.files[0];

net.sendFile('/api/file', file, function (data, status, xhr) {
    // 成功的回调函数
}, function (xhr, errorType, status) {
    // 失败的回调函数
});
```

__注意__ `network.sendFile` 方法的第二个参数 file 需指定要提交的 File 对象或 Blob 对象。

关于 promise 对象的使用，参见 `network.ajax`。

### network.ajax(options)

通用的 AJAX 方法，返回一个 promise 对象。

#### 配置说明

* __url__：请求 URL
* __type__：请求类型 get/post，默认为 get
* __dataType__：响应类型 json/xml/...，默认为 json
* __timeout__：请求超时时间（单位：秒）
* __data__：请求参数对象
* __headers__：请求头部对象
* __success__：请求成功回调函数
* __error__：请求失败回调函数
* __progress__：请求过程进度回调函数

``` javascript
var net = require('network');
net.ajax({
    url: '/api/update',
    dataType: 'json',
    timeout: 30,
    data: {
        id: 12,
        name: 'Elf'
    },
    success: function (data, status, xhr) {
        // 成功的回调函数
    },
    error: function (xhr, errorType, status) {
        // 失败的回调函数
    }
});
```

使用 `network.ajax`、`network.get`、`network.post`、`network.sendForm`、`network.sendFile` 函数均会返回一个 promise 对象，可以通过 done、fail、always 方法代替配置 callback 参数函数的形式绑定相应的处理函数。

``` javascript
var net = require('network');
net.ajax({
    url: '/api/update',
    dataType: 'json',
    timeout: 30,
    data: {
        id: 12,
        name: 'Elf'
    }
}).done(function (data, status, xhr) {
    // 成功的回调函数
}).fail(function (xhr, errorType, status) {
    // 失败的回调函数
}).always(function (xhr) {
    // 请求完成的回调函数
});
```

__注意__ done、fail、always 回调函数传入参数各不相同。

### network.param(data, [appendTo])

序列化对象为形如 `key1=value1&key2=value2` 的字符串并返回，若指定 appendTo，则将 appentTo 视为 URL，将序列化后的字符串拼接到 URL 后，并返回完整 URL。

``` javascript
var net = require('network'),
    url = net.param({
        wd: 'Hello World'
    }, 'http://www.baidu.com/s');
// http://www.baidu.com/s?wd=Hello+World
```

### network.setDefaultOptions(options)

设置默认的请求参数。

#### 配置说明
* __url__：请求 URL
* __type__：请求类型 get/post，默认为 get
* __dataType__：响应类型 json/xml/...，默认为 json
* __timeout__：请求超时时间（单位：秒）
* __data__：请求参数对象
* __headers__：请求头部对象
* __success__：请求成功回调函数
* __error__：请求失败回调函数
* __progress__：请求过程进度回调函数

### network.setDefaultSuccess(onSuccess)

设置默认的请求成功回调函数。

### network.setDefaultError(onError)

设置默认的请求失败回调函数。
