function BenchPixiCircles(container, width, height, data, params) {
    var self, renderer, objects, stage;

    return self = {
        init: function () {
            PIXI.utils._saidHello = true;

            var map = {
                webgl: 'WebGLRenderer',
                canvas: 'CanvasRenderer'
            };

            var canvas;

            if (params.renderer === 'webgl') {
                canvas = params.cache('webgl-pixi');
            } else if (params.renderer === 'canvas') {
                canvas = params.cache('2d');
            }

            params.renderer = map[params.renderer];

            renderer = new PIXI[params.renderer](width, height, {
                view: canvas,
                backgroundColor: 0xFFFFFF
            });

            container.node().appendChild(renderer.view);
            stage = new PIXI.Container();
            objects = [];

            for (var i = 0; i < data.length; i++) {
                var d = data[i];

                var o = new PIXI.Graphics();

                o.beginFill(d.fillNumber, d.fillOpacity);
                o.drawCircle(0, 0, d.radius);
                o.endFill();

                stage.addChild(o);
                objects.push(o);
            }

            self.update();
        },
        update: function () {
            for (var i = 0; i < data.length; i++) {
                var c = data[i];

                objects[i].position.x = c.x;
                objects[i].position.y = c.y;
            }

            renderer.render(stage);
        },
        destroy: function () {
            objects = null;
            renderer.destroy();
            stage.destroy();
            stage = null;
            renderer = null;
        }
    };
}

BenchPixiCircles.version = PIXI.VERSION;
BenchPixiCircles.framework = 'pixi';
BenchPixiCircles.object = 'circle';
BenchPixiCircles.renderers = ['webgl', 'canvas'];

Bench.list.push(BenchPixiCircles);

function BenchPixiRectangles(container, width, height, data, params) {
    var self, renderer, objects, stage;

    return self = {
        init: function () {
            PIXI.utils._saidHello = true;

            var map = {
                webgl: 'WebGLRenderer',
                canvas: 'CanvasRenderer'
            };

            var canvas;

            if (params.renderer === 'webgl') {
                canvas = params.cache('webgl-pixi');
            } else if (params.renderer === 'canvas') {
                canvas = params.cache('2d');
            }

            params.renderer = map[params.renderer];

            renderer = new PIXI[params.renderer](width, height, {
                view: canvas,
                backgroundColor: 0xFFFFFF
            });

            container.node().appendChild(renderer.view);
            stage = new PIXI.Container();
            objects = [];

            for (var i = 0; i < data.length; i++) {
                var d = data[i];

                var o = new PIXI.Graphics();

                o.beginFill(d.fillNumber, d.fillOpacity);
                o.drawRect(0, 0, d.w, d.h);
                o.endFill();

                stage.addChild(o);
                objects.push(o);
            }

            self.update();
        },
        update: function () {
            for (var i = 0; i < data.length; i++) {
                var c = data[i];

                objects[i].position.x = c.x;
                objects[i].position.y = c.y;
            }

            renderer.render(stage);
        },
        destroy: function () {
            objects = null;
            renderer.destroy();
            stage.destroy();
            stage = null;
            renderer = null;
        }
    };
}

BenchPixiRectangles.version = PIXI.VERSION;
BenchPixiRectangles.framework = 'pixi';
BenchPixiRectangles.object = 'rectangle';
BenchPixiRectangles.renderers = ['webgl', 'canvas'];

Bench.list.push(BenchPixiRectangles);

function BenchPixiRounded(container, width, height, data, params) {
    var self, renderer, objects, stage;

    return self = {
        init: function () {
            PIXI.utils._saidHello = true;

            var map = {
                webgl: 'WebGLRenderer',
                canvas: 'CanvasRenderer'
            };

            var canvas;

            if (params.renderer === 'webgl') {
                canvas = params.cache('webgl-pixi');
            } else if (params.renderer === 'canvas') {
                canvas = params.cache('2d');
            }

            params.renderer = map[params.renderer];

            renderer = new PIXI[params.renderer](width, height, {
                view: canvas,
                backgroundColor: 0xFFFFFF
            });

            container.node().appendChild(renderer.view);
            stage = new PIXI.Container();
            objects = [];

            for (var i = 0; i < data.length; i++) {
                var d = data[i];

                var o = new PIXI.Graphics();

                o.lineStyle(d.lineWidth, d.strokeNumber, d.strokeOpacity);
                o.beginFill(d.fillNumber, d.fillOpacity);
                o.drawRoundedRect(0, 0, d.w, d.h, d.cornerRadius);
                o.endFill();

                stage.addChild(o);
                objects.push(o);
            }

            self.update();
        },
        update: function () {
            for (var i = 0; i < data.length; i++) {
                var c = data[i];

                objects[i].position.x = c.x;
                objects[i].position.y = c.y;
            }

            renderer.render(stage);
        },
        destroy: function () {
            objects = null;
            renderer.destroy();
            stage.destroy();
            stage = null;
            renderer = null;
        }
    };
}

BenchPixiRounded.version = PIXI.VERSION;
BenchPixiRounded.framework = 'pixi';
BenchPixiRounded.object = 'rounded';
BenchPixiRounded.renderers = ['webgl', 'canvas'];

Bench.list.push(BenchPixiRounded);

function BenchPixiText(container, width, height, data, params) {
    var self, renderer, objects, stage;

    return self = {
        init: function () {
            PIXI.utils._saidHello = true;

            var map = {
                webgl: 'WebGLRenderer',
                canvas: 'CanvasRenderer'
            };

            var canvas;

            if (params.renderer === 'webgl') {
                canvas = params.cache('webgl-pixi');
            } else if (params.renderer === 'canvas') {
                canvas = params.cache('2d');
            }

            params.renderer = map[params.renderer];

            renderer = new PIXI[params.renderer](width, height, {
                view: canvas,
                backgroundColor: 0xFFFFFF
            });

            container.node().appendChild(renderer.view);
            stage = new PIXI.Container();
            renderer.render(stage);
            objects = [];

            for (var i = 0; i < data.length; i++) {
                var d = data[i];

                var o = new PIXI.Text(d.text, {font: d.textSize + 'px ' + d.fontFamily, fill: d.fillRgba});

                stage.addChild(o);
                objects.push(o);
            }

            self.update();
        },
        update: function () {
            for (var i = 0; i < data.length; i++) {
                var c = data[i];

                objects[i].position.x = c.x;
                objects[i].position.y = c.y;
            }

            renderer.render(stage);
        },
        destroy: function () {
            objects = null;
            renderer.destroy();
            stage.destroy();
            stage = null;
            renderer = null;
        }
    };
}

BenchPixiText.version = PIXI.VERSION;
BenchPixiText.framework = 'pixi';
BenchPixiText.object = 'text';
BenchPixiText.renderers = ['webgl', 'canvas'];

Bench.list.push(BenchPixiText);
