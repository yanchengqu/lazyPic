(function(window) {
    var isAndroid = /Android/i.test(window.navigator.userAgent),
        dummyStyle = document.createElement('div').style,
        vendor = (function() {
            var vendors = 't,webkitT,MozT,msT,OT'.split(','),
                t,
                i = 0,
                l = vendors.length;

            for (; i < l; i++) {
                t = vendors[i] + 'ransform';
                if (t in dummyStyle) {
                    return vendors[i].substr(0, vendors[i].length - 1);
                }
            }

            return false;
        })(),
        transitionEndEvent = (function() {
            if (vendor == 'webkit' || vendor === 'O') {
                return vendor.toLowerCase() + 'TransitionEnd';
            }
            return 'transitionend';
        }()),
        listenTransition = function(target, duration, callbackFn) {
            var me = this,
                clear = function() {
                    if (target.transitionTimer) clearTimeout(target.transitionTimer);
                    target.transitionTimer = null;
                    target.removeEventListener(transitionEndEvent, handler, false);
                },
                handler = function() {
                    clear();
                    if (callbackFn) callbackFn.call(me);
                };
            clear();
            target.addEventListener(transitionEndEvent, handler, false);
            target.transitionTimer = setTimeout(handler, duration + 100);
        },
        proxy = function(fn, scope, ext) {
            return function() {
                var narg = ext ? Array.prototype.concat.call(arguments, ext) : arguments;
                return fn.apply(scope, narg);
            };
        };

    var ImageLazyLoader = function(config) {
        config = config || {};
        for (var o in config) {
            this[o] = config[o];
        }
        this.ct = document.body;

        this._onScroll_ = proxy(this._onScroll, this);
        window.addEventListener('scroll', this._onScroll_, false);
        this.maxScrollY = 0;

        if (isAndroid) { // 在android下，opacity动画效果比较差
            this.useFade = false;
        }

        this.elements = [];
        this.lazyElements = {};
        this.scan(this.ct);

        this._onPageShow_ = proxy(this._onPageShow, this);
        window.addEventListener('pageshow', this._onPageShow_, false);
    };

    ImageLazyLoader.prototype = {
        range: 200,

        realSrcAttribute: 'data-src',

        useFade: true,

        _onPageShow: function(e) {
            if (e.persisted) {
                this.maxScrollY = 0;
                this.scan(this.ct);
            }
        },

        _onScroll: function() {
            var scrollY = this.getScrollY();
            if (scrollY > this.maxScrollY) {
                this.maxScrollY = scrollY;
                this._scrollAction();
            }
        },

        getScrollY: function() {
            return window.pageYOffset || window.scrollY;
        },

        _scrollAction: function() {
            clearTimeout(this.lazyLoadTimeout);
            this.elements = this.elements.filter(function(img) {
                if ((this.range + window.innerHeight) >= (img.getBoundingClientRect().top - document.documentElement.clientTop)) {
                    var realSrc = img.getAttribute(this.realSrcAttribute);
                    if (realSrc) {
                        if (this.lazyElements[realSrc]) {
                            this.lazyElements[realSrc].push(img);
                        } else {
                            this.lazyElements[realSrc] = [img];
                        }
                    }
                    return false;
                }
                return true;
            }, this);
            this.lazyLoadTimeout = setTimeout(proxy(this._loadImage, this), isAndroid ? 500 : 0);
        },

        _loadImage: function() {
            var img, realSrc, imgs;
            for (realSrc in this.lazyElements) {
                imgs = this.lazyElements[realSrc];
                img = imgs.shift();
                if (imgs.length === 0) {
                    delete this.lazyElements[realSrc];
                }
                if(img.nodeName.toLowerCase() == 'img' && img.nodeType == 1){
                    img.addEventListener('load', proxy(this._onImageLoad, this), false);
                }else if(img.nodeType == 1){
                    var timg = img;
                    img = new Image;
                    img.setAttribute(this.realSrcAttribute, timg.getAttribute(this.realSrcAttribute));
                    img.addEventListener('load', proxy(this._onImageLoad, this, timg), false);
                }else{
                    continue;
                }
                
                if (img.src != realSrc) {
                    this._setImageSrc(img, realSrc);
                } else {
                    this._onImageLoad(img);
                }
            }
        },

        _onImageLoad: function(e,vimg) {
            var me = this,
                img = vimg || e.target || e,
                realSrc = img.getAttribute(me.realSrcAttribute),
                imgs = me.lazyElements[realSrc];

            me._showImage(img);

            if (imgs) {
                imgs.forEach(function(i) {
                    if(i.nodeName.toLowerCase() == 'img'){
                        me._setImageSrc(i, realSrc);   
                    }
                    me._showImage(i);
                });
                delete me.lazyElements[realSrc];
            }
        },
        _setImageSrc: function(img, realSrc) {
            if (this.useFade) {
                img.style.opacity = '0';
            }
            img.src = realSrc;
        },
        _setImageBg: function(img, realSrc){
            if (img) {
                img.style.backgroundImage = 'url(' + realSrc + ')';
            }
        },
        _showImage: function(img) {
            var me = this,
                cb = function() {
                    img.setAttribute('data-lazy-load-completed', '1');
                    if (me.onImageLoad) me.onImageLoad(img);
                };
            if(img.nodeName.toLowerCase() != 'img'){
                this._setImageBg(img,img.getAttribute(this.realSrcAttribute));
                cb();
                return;
            }
            if (me.useFade) {
                img.style[vendor + 'Transition'] = 'opacity 200ms';
                img.style.opacity = 1;
                listenTransition(img, 200, cb);
            } else {
                cb();
            }
        },

        scan: function(ct) {
            var imgs;
            ct = ct || document.body;
            imgs = ct.querySelectorAll('[' + this.realSrcAttribute + ']') || [];
            imgs = Array.prototype.slice.call(imgs, 0);
            imgs = imgs.filter(function(img) {
                if (img.getAttribute('data-lazy-load-completed') == '1') {
                    return false;
                }
                return true;
            }, this);
            this.elements = this.elements.concat(imgs);
            this._scrollAction();
        },

        destroy: function() {
            if (!this.destroyed) {
                this.destroyed = true;
                window.removeEventListener('scroll', this._onScroll_, false);
                window.removeEventListener('pageshow', this._onPageShow_, false);
                this.elements = this.lazyElements = null;
            }
        }
    };

    dummyStyle = null;

    window.ImageLazyLoader = ImageLazyLoader;

})(window);
