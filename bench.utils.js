function BenchUtilsChartLines(chartElement, tests, grouped, outerWidth, outerHeight, margin, color) {
    var svg;

    function update() {
        chart();
    }

    function chart() {
        var innerWidth = outerWidth - margin * 2;
        var innerHeight = outerHeight - margin * 2;

        var y = d3.scale.linear()
            .domain([0, 60])
            .range([innerHeight, 0]);

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient('left')
            .tickSize(-innerWidth)
            .tickPadding(8);

        var x = d3.scale.linear()
            .domain(d3.extent(tests))
            .range([0, innerWidth]);

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient('bottom')
            .tickSize(-innerHeight)
            .tickValues(tests)
            .tickPadding(8);

        var path = d3.svg.line();

        if (!svg) {
            svg = chartElement
                .attr('width', outerWidth)
                .attr('height', outerHeight)
                .append('g')
                .attr('transform', 'translate(' + margin + ',' + margin + ')');

            var gradient = svg.append('defs')
                .append('linearGradient')
                .attr('id', 'gradient')
                .attr('x1', '0%')
                .attr('y1', '100%')
                .attr('x2', '0%')
                .attr('y2', '0%')
                .attr('spreadMethod', 'pad');

            for (var i = 0; i <= 100; i += 20) {
                gradient.append('stop')
                    .attr('offset', i + '%')
                    .attr('stop-color', color(i / 100))
                    .attr('stop-opacity', 0.33);
            }

            svg.append('rect')
                .attr('fill', 'url(#gradient)')
                .attr('width', innerWidth)
                .attr('height', innerHeight);

            svg.append('g')
                .attr('class', 'axis')
                .attr('transform', 'translate(0,' + innerHeight + ')')
                .call(xAxis)
                .append('text')
                .attr('transform', 'rotate(90)')
                .attr('y', -innerWidth - 10)
                .style('text-anchor', 'end')
                .text('Objects');

            svg.append('g')
                .attr('class', 'axis')
                .call(yAxis)
                .append('text')
                .attr('x', 0)
                .attr('y', -10)
                .text('FPS');
        }

        var line = svg.selectAll('g.line')
            .data(grouped);

        line.exit().remove();

        var g = line.enter().append('g')
            .attr('class', 'line');

        g.append('path').attr('id', function (d, i) {
            return 'line' + i;
        });

        line.selectAll('path')
            .attr('d', function (d) {
                var l = d3.svg.line().interpolate('monotone');

                var r = d.data.filter(function (d) {
                    return d.pending === false;
                }).map(function (d) {
                    return [x(d.count), y(Math.min(60, d.fps || 0))];
                });

                return l(r);
            });

        g.append('text')
            .attr('dy', '-4px')
            .attr('text-anchor', 'middle')
            .append('textPath')
            .attr('xlink:href', function (d, i) {
                return '#line' + i;
            })
            .attr('startOffset', function (d, i) {
                return (30 + 60 * (i / grouped.length)) + '%';
            })
            .text(function (d) {
                return d.displayName;
            });

        line.selectAll('text').style('display', function (d) {
            return (d.data.filter(function (d) {
                return d.pending === false;
            }).length > 1) ? null : 'none';

        });

        line.on('mouseenter', function (dd) {
            line.classed('highlight', function (d) {
                return d === dd;
            });

            line.classed('mute', function (d) {
                return d !== dd;
            });
        });

        svg.on('mouseleave', function () {
            line.classed({highlight: false, mute: false});
        });
    }

    return {
        update: update
    }
}

function BenchUtilsChartPack(packElement, filterObjectElement, filterCountElement,
                             grouped, expanded, width, height, hMargin, vMargin, color, duration, font, dy) {
    var measureCanvas = document.createElement('canvas');

    measureCanvas.width = 8;
    measureCanvas.height = 8;

    var measureContext = measureCanvas.getContext('2d');
    var measureCache = {};
    var objectFilter = {};
    var countFilter = {};

    var nestSum = d3.nest()
        .key(function (d) {
            return d.data.parent.name;
        })
        .rollup(function (leaves) {
            return {
                sum: d3.sum(leaves, function (d) {
                    return d.fps;
                })
            }
        });

    var nestAlign = d3.nest()
        .key(function (d) {
            return d.row;
        })
        .rollup(function (leaves) {
            return {
                sum: d3.sum(leaves, function (d) {
                    return d.minWidth;
                }) + (leaves.length - 1) * hMargin,
                cols: leaves
            };
        });

    function update(animate) {
        pack(width, height, animate);
    }

    function measure(text, font) {
        measureCache[font] = measureCache[font] || {};

        measureContext.font = font;

        return measureCache[font][text] ||
            (measureCache[font][text] = measureContext.measureText(text).width);
    }

    function bounding(group) {
        var x = [];
        var y = [];

        group.children.forEach(function (d) {
            x.push(d.x - d.r, d.x + d.r);
            y.push(d.y - d.r, d.y + d.r);
        });

        group.ex = d3.extent(x);
        group.ey = d3.extent(y);
        group.width = group.ex[1] - group.ex[0];
        group.height = group.ey[1] - group.ey[0];
        group.cx = (group.ex[1] + group.ex[0]) / 2;
        group.cy = (group.ey[1] + group.ey[0]) / 2;
    }

    function align(groups, width, margin) {
        var rows = nestAlign.entries(groups);

        rows.forEach(function (row) {
            var shift = (width - row.values.sum) / 2 - margin;

            row.values.cols.forEach(function (col) {
                col.tx += shift;

                col.children.forEach(function (child) {
                    child.tx += shift;
                });
            });
        });
    }

    function tabularize(packedData, width) {
        var groups = packedData.filter(function (d) {
            return d.depth === 1;
        });

        groups.sort(function (a, b) {
            return b.r - a.r;
        });

        var left = hMargin;
        var top = vMargin * 2;
        var first = 0;
        var height = 0;
        var col = 0;
        var row = 0;

        for (var i = 0; i < groups.length; i++) {
            var d = groups[i];

            bounding(d);

            d.minWidth = Math.max(measure(d.key, font) + hMargin, d.width);

            if ((col !== 0) && ((left + d.minWidth + 2 * hMargin) > width)) {
                left = hMargin;
                top += first + 2 * vMargin;
                first = d.height;
                col = 0;
                row++;
            }

            first = Math.max(first, d.height);

            height = top + first + vMargin;

            d.col = col;
            d.row = row;

            col++;

            d.tx = left + d.minWidth / 2;
            d.ty = top + d.height / 2;

            left += d.minWidth + hMargin;

            var dx = d.tx - d.x;
            var dy = d.ty - d.y;

            d.children.forEach(function (c) {
                c.tx = c.x + dx;
                c.ty = c.y + dy;
            });
        }

        align(groups, width, hMargin);

        return height;
    }

    function ui(root, data, values) {
        var ol = root.select('.list').selectAll('span.filter')
            .data(d3.range(0, data.length));

        var sp = ol.enter().append('span').attr('class', 'filter');

        sp.append('a')
            .attr('class', 'click');

        sp.append('span');

        root.selectAll('a')
            .text(function (d) {
                return data[d];
            })
            .classed('muted', function (d) {
                return !values[data[d]]
            })
            .on('click', function (d) {
                values[data[d]] = !values[data[d]];
                d3.select(this).classed('muted', !values[data[d]]);
                update(true);
            });

        ol.selectAll('span')
            .text(function (d) {
                return (d + 1) < data.length ? ', ' : null;
            });

        ol.exit().remove();
    }

    function filters(items) {
        var objectList = {};
        var countList = {};

        items.forEach(function (d) {
            countList[d.data.count] = true;

            objectList[d.data.parent.object] = true;

            countFilter[d.data.count] = countFilter[d.data.count] === undefined ?
                true : countFilter[d.data.count];

            objectFilter[d.data.parent.object] = objectFilter[d.data.parent.object] === undefined ?
                true : objectFilter[d.data.parent.object];
        });

        objectList = Object.keys(objectList);
        countList = Object.keys(countList);

        countList = countList.map(function (d) {
            return parseInt(d);
        });

        ui(filterObjectElement, objectList, objectFilter);
        ui(filterCountElement, countList, countFilter);
    }

    function pack(width, height, animate) {
        width -= 2 * hMargin;

        var names = d3.map(grouped, function (d) {
            return d.name;
        }).keys();

        var entries = expanded.filter(function (d) {
                return d.fps;
            })
            .map(function (d) {
                return {
                    fps: d.fps,
                    data: d
                }
            });

        filters(entries);

        var available = entries;

        entries = entries.filter(function (d) {
            return (countFilter[d.data.count] || (countFilter[d.data.count] === undefined)) &&
                (objectFilter[d.data.parent.object] || (objectFilter[d.data.parent.object] === undefined));
        });

        var sum = nestSum.entries(entries);

        var sums = {};

        sum.forEach(function (d) {
            sums[d.key] = d.values.sum;
        });

        names.sort(function (a, b) {
            return (sums[a] || 0) - (sums[b] || 0);
        });

        var nested = d3.nest()
            .key(function (d) {
                return d.data.parent.framework + '/' + d.data.parent.name;
            })
            .entries(entries);

        var pack = d3.layout.pack()
            .sort(function (a, b) {
                return b.value - a.value;
            })
            .size([width, height])
            .children(function (d) {
                return d.values;
            })
            .value(function (d) {
                return d.fps;
            });

        var pd = pack.nodes({values: nested});

        var newHeight = tabularize(pd, width + 2 * hMargin, hMargin);
        packElement.style('display', newHeight ? null : 'none')
            .transition().duration(animate ? duration : 0)
            .attr('height', Math.max(height, newHeight));

        filterObjectElement.style('display', available.length ? null : 'none');
        filterCountElement.style('display', available.length ? null : 'none');

        pd = pd.filter(function (d) {
            return d.parent;
        });

        var groupColor = d3.scale.ordinal().range(d3.range(0, 1.001, 1 / names.length)).domain(names);

        draw(pd, groupColor, animate);
    }

    function draw(pd, groupColor, animate) {

        var fpsItems = pd.filter(function (d) {
            return !d.children;
        });

        var groupItems = pd.filter(function (d) {
            return d.children;
        });

        var nodes = packElement
            .selectAll('.node')
            .data(pd, function (d) {
                return d.key || d.data.displayName;
            });

        nodes.exit().remove();

        var newNodes = nodes.enter().append('g')
            .attr('class', function (d) {
                return d.children ? 'node' : 'leaf node';
            })
            .attr('transform', function (d) {
                return 'translate(' + [d.tx, d.ty] + ')';
            });

        newNodes.filter(function (d) {
                return !d.children;
            })
            .append('circle')
            .style('fill', '#fff')
            .attr('r', 0);

        newNodes.filter(function (d) {
                return d.children;
            })
            .append('text');

        nodes.transition().duration(animate ? duration : 0)
            .attr('transform', function (d) {
                return 'translate(' + [d.tx, d.ty] + ')';
            });

        packElement.selectAll('circle')
            .data(fpsItems, function (d) {
                return d.key || d.data.displayName;
            })
            .transition().duration(animate ? duration : 0)
            .style('fill', function (d) {
                return d.data ? color(groupColor(d.data.parent.name)) : null;
            })
            .attr('r', function (d) {
                return d.r || 0;
            });

        packElement.selectAll('text')
            .data(groupItems, function (d) {
                return d.key || d.data.displayName;
            })
            .transition().duration(animate ? duration : 0)
            .attr('dy', function (d) {
                return -d.height / 2 - dy;
            })
            .style('text-anchor', 'middle')
            .text(function (d) {
                return d.key;
            });
    }

    return {
        update: update
    };
}

function BechUtilsTable(tableElement, versionElement, version, svg, tests, grouped, color, retest) {
    function results(done) {
        var f = d3.format('.1f');

        versionElement.style('display', version ? null : 'none');

        tableElement.select('.group').attr('colspan', tests.length);
        tableElement.select('.objects').selectAll('th').data(tests).enter().append('th').text(function (d) {
            return d
        });

        var b = tableElement.select('tbody').on('mouseleave', function () {
            svg.selectAll('g.line').classed({mute: false, highlight: false});
        });

        var g = b.selectAll('tr').data(grouped);

        g.enter().append('tr').on('mouseenter', function (dd) {
            svg.selectAll('g.line').classed('mute', function (d) {
                return d !== dd;
            });
            svg.selectAll('g.line').classed('highlight', function (d) {
                return d === dd;
            });
        });

        var ths = g.selectAll('th')
            .data(function (d) {
                return [d.framework, d.name, d.object, d.version];
            });

        ths.enter()
            .append('th').style('text-align', function (d, i) {
                return i ? 'center' : 'left'
            })
            .html(function (d, i) {
                return i ? '<small>' + d + '</small>' : d;
            });

        ths.style('display', function (d, i) {
            return ((i === 3) && !version) ? 'none' : null;
        });

        g.selectAll('td.fps').data(function (d) {
            return d.data;
        }).enter().append('td').attr('class', 'fps');

        g.selectAll('td.fps').text(function (d, i) {
                var ex = '';

                if (!d.disabled && !d.pending &&
                    d.parent.data[i + 1] && (d.parent.data[i + 1].fps !== undefined) &&
                    (d3.round(d.parent.data[i + 1].fps, 1) > d3.round(d.fps, 1))) {
                    ex = '!';
                }

                return ex + (d.disabled ? 'n/a' : d.pending ? '?' : d.fps ? f(d.fps) : done ? '—' : '');
            })
            .style('background-color', function (d) {
                if (d.pending === true) {
                    return '#333';
                }

                var c = d3.rgb(color((d.fps || 0) / 60));
                return (d.pending === false) ? 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.33)' : null;
            })
            .style('color', function (d) {
                if (d.pending === true) {
                    return '#fff';
                }
            })
            .style('text-align', function (d) {
                return (d.pending === true || !d.fps) ? 'center' : 'right';
            })
            .classed('click', done)
            .on('click', !done ? null : retest);

        var tl = g.selectAll('td.trend').data(function (d) {
            return [d];
        });

        tl.enter().append('td').attr('class', 'trend line')
            .style({
                padding: 0,
                width: '48px'
            })
            .append('svg')
            .attr({width: 48, height: 15})
            .style({display: 'block'})
            .append('path');

        var y = d3.scale.linear()
            .domain([0, 60])
            .range([13, 2]);

        var x = d3.scale.linear()
            .domain(d3.extent(tests))
            .range([1, 47]);

        g.selectAll('td.trend path')
            .attr('d', function (d) {
                var l = d3.svg.line().interpolate('linear');

                var r = d.data.filter(function (d) {
                    return d.pending === false;
                }).map(function (d) {
                    return [x(d.count), y(d.fps || 0)];
                });

                return l(r)
            });
    }

    return {
        update: results
    }
}
