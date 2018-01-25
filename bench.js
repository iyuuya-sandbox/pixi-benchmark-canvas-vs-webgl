function Bench(cfg) {
    var tests = cfg.tests;
    var time = cfg.time;
    var pause = cfg.pause;
    var width = cfg.width;
    var height = cfg.height;
    var populate = cfg.populate || _populate;
    var iterate = cfg.iterate || _iterate;
    var color = Bench.color = cfg.color || d3.interpolateHcl(d3.hcl(0, 70, 70).brighter(1), d3.hcl(150, 70, 70).brighter(1));
    var autoStart = cfg.autoStart || false;
    var version = false;

    var containerElement = d3.select('#container');
    var chartElement = d3.select('#chart');
    var tableElement = d3.select('#result');
    var messageElement = d3.select('#message');
    var nameLabel = d3.select('#name');
    var noteLabel = d3.select('#note');
    var runButton = d3.select('#run');
    var stopButton = d3.select('#stop');
    var infoButton = d3.select('#info');
    var resetButton = d3.select('#reset');
    var shareButton = d3.select('#share');
    var linkElement = d3.select('#link');
    var versionElement = d3.select('#version');
    var arrowElement = d3.select('#arrow');
    var packElement = d3.select('#pack');
    var filterObjectElement = d3.select('#filter-object');
    var filterCountElement = d3.select('#filter-count');

    var expanded;
    var grouped;
    var stop;
    var cursor = 0;
    var cache = {};
    var pack;
    var results;

    start();

    function start() {
        if (!window.location.origin) {
            window.location.origin = window.location.protocol + "//" + window.location.hostname +
                (window.location.port ? ':' + window.location.port : '');
        }

        initData();
        var sharedStatus = shared();

        //if (!sharedStatus.wasShared) {
        //    version = true;
        //}

        results = BechUtilsTable(tableElement, versionElement, version, chartElement, tests, grouped, color, retest);
        chart = BenchUtilsChartLines(chartElement, tests, grouped, 960, 400 + 48 * 2, 48, color);
        pack = BenchUtilsChartPack(packElement, filterObjectElement, filterCountElement,
            grouped, expanded, 413, 400 - 2 * 20, 8, 14, color, 500, '14px monospace', 14 / 2);

        initUi();
        results.update();
        chart.update();
        pack.update();

        if (autoStart) {
            test();
        } else {
            results.update(true);
            ui(false);
        }

        infoButton.style('display', 'none');

        if (!sharedStatus.wasShared) {
            resetButton.style('display', 'none');
            shareButton.style('visibility', 'hidden');
        }

        if (!sharedStatus.isInSharedFrame) {
            linkElement.style('display', 'none');
        }

        d3.selectAll('.cloak').classed('cloak', false);
    }

    function shared() {
        var s = parseSearch();
        var wasShared, isInSharedFrame;

        if (s.r) {
            try {
                var json = JSON.parse(s.r.replace(/([^:,{]*):/g, '"$1":'));
                wasShared = deserialize(json);
            } catch (ign) {
            }
        }

        if (wasShared && s.s) {
            d3.selectAll('body > *').remove();

            document.body.style.width = '960px';

            tableElement.classed('pull-left', true);
            packElement.classed('pull-right', true);

            document.body.appendChild(tableElement.node());

            document.body.appendChild(packElement.node());

            var link = window.location.origin +
                window.location.pathname.replace(/\/raw\/([^/]+)\/[^/]+(\/?)/gi, '/raw/$1$2');

            linkElement.select('a').attr('href', link + '?r=' + s.r);
            document.body.appendChild(linkElement.node());

            isInSharedFrame = true;
        }

        return {
            wasShared: wasShared,
            isInSharedFrame: isInSharedFrame
        };
    }

    function parseSearch() {
        var r = {};
        var query = window.location.search.substring(1);
        var vars = query.split('&');

        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');

            r[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }

        return r;
    }

    function initData() {
        expanded = Bench.expanded = [];
        grouped = Bench.grouped = [];

        Bench.list.forEach(function (f) {
            f.renderers.forEach(function (r) {
                var d = [];
                var dn = f.framework + '/' + r + '/' + f.object;
                var sn = f.framework + ' /' + r + '/' + f.object;

                var g = {
                    framework: f.framework,
                    object: f.object,
                    name: r,
                    version: f.version,
                    data: d,
                    displayName: dn,
                    sortName: sn
                };

                tests.forEach(function (t) {
                    var s = {
                        type: f,
                        renderer: r,
                        count: t,
                        displayName: dn + '/' + t,
                        sortName: sn + '/' + d3.format('06d')(t),
                        disabled: f.limits && f.limits[r] && t > f.limits[r],
                        parent: g
                    };

                    expanded.push(s);
                    d.push(s);
                });

                grouped.push(g);
            });
        });

        expanded.sort(function (a, b) {
            return a.sortName.localeCompare(b.sortName);
        });

        grouped.sort(function (a, b) {
            return a.sortName.localeCompare(b.sortName);
        });
    }

    function initUi() {
        containerElement.style({width: width + 'px', height: height + 'px'});

        stopButton.on('click', function () {
            stop = true;
            stopButton.style('display', 'none');
        });

        runButton.on('click', function () {
            if (!available()) {
                reset();
            }

            cursor = (cursor < expanded.length) ? cursor : 0;
            test();
        });

        resetButton.on('click', reset);

        infoButton.on('click', function () {
            infoButton.style('display', 'none');
            containerElement.selectAll('*').remove();
            containerElement.node().appendChild(messageElement.node());
            nameLabel.text('');
        });


        shareButton.on('mousedown', function () {
            var serialized = serialize();
            var str = JSON.stringify(serialized).replace(/"/g, '');
            var link = window.location.origin +
                window.location.pathname.replace(/\/raw\/([^/]+)\/[^/]+\/?/gi, '/raw/$1/');
            shareButton.attr('href', link + '?r=' + str);

            var tSize = tableElement.node().getBoundingClientRect();

            var frame = '<iframe ' +
                'sandbox="allow-scripts allow-forms allow-same-origin allow-top-navigation" ' +
                'width="' + tSize.width + 'px" ' +
                'height="' + tSize.height + 'px" ' +
                'frameborder="0" ' +
                'style="border: none" ' +
                'src="' + link + '?s=tl&r=' + str + '">' +
                '</iframe>';

            if (console.dir) {
                console.dir({table: frame, hash: str, link: link});
            } else {
                console.log(frame);
            }
        });
    }

    function ui(running) {
        infoButton.style('display', !running ? null : 'none');
        noteLabel.style('visibility', !running ? null : 'hidden');
        runButton.style('display', !running ? null : 'none');
        stopButton.style('display', running ? null : 'none');
        resetButton.style('display', !running ? null : 'none');
        shareButton.style('visibility', !running ? null : 'hidden');
    }

    function reset() {
        expanded.forEach(function (d) {
            delete d.fps;
            delete d.pending;
        });

        //version = true;
        results.update(true);
        chart.update();
        pack.update();
    }

    function serialize() {
        var s = {};

        grouped.forEach(function (g) {
            var o = {};
            var use = false;

            g.data.forEach(function (d) {
                if (d.fps !== undefined) {
                    o[d.count] = d3.round(d.fps, 1);
                    use = true;
                }
            });

            if (use) {
                var f = s[g.framework] = s[g.framework] || {};
                var r = f[g.name] = f[g.name] || {};
                r[g.object] = o;
            }
        });

        return s;
    }

    function deserialize(j) {
        var ret = false;

        grouped.forEach(function (g) {
            g.data.forEach(function (d) {
                if (j[g.framework] &&
                    j[g.framework][g.name] &&
                    j[g.framework][g.name][g.object] &&
                    (j[g.framework][g.name][g.object][d.count] !== undefined)) {
                    d.fps = j[g.framework][g.name][g.object][d.count];
                    d.pending = false;
                    ret = true;
                } else {
                    delete d.fps;
                }
            });
        });

        return ret;
    }

    function available() {
        return expanded.filter(function (d) {
            return (d.pending === undefined) && !d.disabled;
        }).length;
    }

    function retest(d) {
        results.update();
        test(d);
    }

    var seed;

    function random() {
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    function _populate(count) {
        var data = [];

        seed = 1;
        var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

        var triangleSide = Math.sqrt(12 * 12 * 4 / Math.sqrt(3));
        var triangleRadius = Math.sqrt(3) * triangleSide / 3;
        var triangleHeight = Math.sqrt(3) * triangleSide / 2;


        for (var i = 0; i < count; i++) {
            var c = d3.rgb(color(i / count));

            var d = {
                x: width * random(),
                y: height * random(),

                vx: (random() - 0.5) * 1.4,
                vy: (random() - 0.5) * 1.4,

                w: 12,
                h: 12,

                cornerRadius: 3,
                radius: 7, // === Math.round(Math.sqrt(((12 * 12) / Math.PI))),
                lineWidth: 2,

                fillNumber: parseInt(c.toString().replace('#', '0x')),
                fillRgba: 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.75)',
                fillOpacity: 0.75,

                strokeRgba: 'rgba(128,128,128, 0.5)',
                strokeNumber: 0x808080,
                strokeOpacity: 0.5,

                text: alphabet[i % alphabet.length],
                textSize: 24,
                fontFamily: 'Arial',

                circleSegments: 16,

                triangleSide: triangleSide,
                triangleRadius: triangleRadius,
                triangleHeight: triangleHeight
            };

            d.fillRgbaArray = [c.r / 255, c.g / 255, c.b / 255, d.fillOpacity];

            data.push(d);
        }

        return data;
    }

    function _iterate(data) {
        for (var i = 0; i < data.length; i++) {
            var c = data[i];

            if (c.x >= width || c.x <= 0) {
                c.vx *= -1;
            }

            if (c.y >= height || c.y <= 0) {
                c.vy *= -1;
            }

            c.x += c.vx;
            c.y += c.vy;
        }
    }

    function getCache(id) {
        return cache[id] || (cache[id] = document.createElement('canvas'));
    }

    function test(single) {
        var t = single || expanded[cursor++];

        if (arrowElement) {
            arrowElement.remove();
            arrowElement = null;
        }

        if ((t.disabled || (t.fps !== undefined)) && !single) {
            if (cursor < expanded.length) {
                setTimeout(test, 0);
            } else {
                stop = false;
                results.update(true);
                ui(false);
            }

            return;
        }

        if (single) {
            cursor = expanded.indexOf(single) + 1;
        }

        delete t.disabled;

        var cycles = 0;
        var data = populate(t.count);

        var r = t.type(containerElement, width, height, data, {
            renderer: t.renderer,
            cache: getCache
        });

        t.pending = true;
        t.time = 0;
        t.first = true;

        containerElement.style('display', null);
        results.update();
        ui(true);

        setTimeout(function () {
            containerElement.select('*').remove();
            nameLabel.text('');

            setTimeout(function () {
                nameLabel.text(t.displayName);
                r.init();

                setTimeout(function () {
                    d3.timer(tick);
                }, pause);
            }, pause);
        }, pause);

        function tick(elapsed) {
            t.first = t.first === true ? elapsed : t.first;
            t.time = elapsed;

            if (elapsed < time) {
                iterate(data);
                r.update();
                cycles++;
            } else {
                t.time -= t.first;
                t.repaint = t.time / cycles;
                t.fps = Math.min(60, 1000 / t.repaint);
                t.pending = false;
                r.destroy();

                chart.update();
                pack.update();

                if (!stop && !single && (cursor < expanded.length)) {
                    results.update();
                    ui(true);
                    setTimeout(test, pause);
                } else {
                    stop = false;
                    results.update(true);
                    ui(false);
                }

                return true;
            }
        }
    }
}

Bench.list = [];
Bench.version = '0.1.0';
