﻿InteractiveDataDisplay.Petal = {
    prepare: function (data) {
        if (!data.maxDelta) {
            var i = 0;
            while (isNaN(data.size.upper95[i]) || isNaN(data.size.lower95[i])) i++;
            var maxDelta = data.size.upper95[i] - data.size.lower95[i];
            i++;
            for (; i < data.size.upper95.length; i++)
                if (!isNaN(data.size.upper95[i]) && !isNaN(data.size.lower95[i]))
                    maxDelta = Math.max(maxDelta, data.size.upper95[i] - data.size.lower95[i]);
            data.maxDelta = maxDelta;
        }
        // y
        if (data.y == undefined || data.y == null) throw "The mandatory property 'y' is undefined or null";
        if (!InteractiveDataDisplay.Utils.isArray(data.y)) throw "The property 'y' must be an array of numbers";
        var n = data.y.length;

        var mask = new Int8Array(n);
        InteractiveDataDisplay.Utils.maskNaN(mask, data.y);

        // x
        if (data.x == undefined)
            data.x = InteractiveDataDisplay.Utils.range(0, n - 1);
        else if (!InteractiveDataDisplay.Utils.isArray(data.x)) throw "The property 'x' must be an array of numbers";
        else if (data.x.length != n) throw "Length of the array which is a value of the property 'x' differs from lenght of 'y'"
        else InteractiveDataDisplay.Utils.maskNaN(mask, data.x);

        // border
        if (data.border == undefined || data.border == "none")
            data.border = null; // no border

        // colors        
        if (data.color == undefined) data.color = InteractiveDataDisplay.Markers.defaults.color;
        if (InteractiveDataDisplay.Utils.isArray(data.color)) {
            if (data.color.length != n) throw "Length of the array 'color' is different than length of the array 'y'"
            if (n > 0 && typeof (data.color[0]) === "number") { // color is a data series                 
                var palette = data.colorPalette;
                if (palette == undefined) palette = InteractiveDataDisplay.Markers.defaults.colorPalette;
                if (typeof palette == 'string') palette = new InteractiveDataDisplay.ColorPalette.parse(palette);
                if (palette != undefined && palette.isNormalized) {
                    var r = InteractiveDataDisplay.Utils.getMinMax(data.color);
                    r = InteractiveDataDisplay.Utils.makeNonEqual(r);
                    data.colorPalette = palette = palette.absolute(r.min, r.max);
                }
                var colors = new Array(n);
                for (var i = 0; i < n; i++) {
                    var color = data.color[i];
                    if (color != color) // NaN
                        mask[i] = 1;
                    else {
                        var rgba = palette.getRgba(color);                        
                        colors[i] = "rgba(" + rgba.r + "," + rgba.g + "," + rgba.b + "," + rgba.a + ")";
                    }
                }
                data.color = colors;
            }
            data.individualColors = true;
        } else {
            data.individualColors = false;
        }

        // sizes    
        var sizes = new Array(n);
        if (InteractiveDataDisplay.Utils.isArray(data.size.lower95) && InteractiveDataDisplay.Utils.isArray(data.size.upper95)) {
            if (data.size.lower95.length != n && data.size.upper95.length != n) throw "Length of the array 'size' is different than length of the array 'y'";
            if (n > 0 && typeof (data.size.lower95[0]) === "number" && typeof (data.size.upper95[0]) === "number") { // color is a data series                 
                var sizes_u95 = [];
                var sizes_l95 = [];
                for (var i = 0; i < n; i++) {
                    var size_u95 = data.size.upper95[i];
                    var size_l95 = data.size.lower95[i];
                    if (size_u95 != size_u95 || size_l95 != size_l95)
                        mask[i] = 1;
                    else {
                        sizes_u95[i] = data.size.upper95[i];
                        sizes_l95[i] = data.size.lower95[i];
                    }
                }
                data.upper95 = sizes_u95;
                data.lower95 = sizes_l95;
            }
        }
        data.size = '15.0';
        for (var i = 0; i < n; i++) sizes[i] = data.size;
            data.sizeMax = data.size;
        data.size = sizes;

        // Filtering out missing values
        var m = 0;
        for (var i = 0; i < n; i++) if (mask[i] === 1) m++;
        if (m > 0) { // there are missing values
            m = n - m;
            data.x = InteractiveDataDisplay.Utils.applyMask(mask, data.x, m);
            data.y = InteractiveDataDisplay.Utils.applyMask(mask, data.y, m);
            data.size = InteractiveDataDisplay.Utils.applyMask(mask, data.size, m);
            data.upper95 = InteractiveDataDisplay.Utils.applyMask(mask, data.upper95, m);
            data.lower95 = InteractiveDataDisplay.Utils.applyMask(mask, data.lower95, m);
            if (data.individualColors)
                data.color = InteractiveDataDisplay.Utils.applyMask(mask, data.color, m);
            var indices = Array(m);
            for (var i = 0, j = 0; i < n; i++) if (mask[i] === 0) indices[j++] = i;
            data.indices = indices;
        } else {
            data.indices = InteractiveDataDisplay.Utils.range(0, n - 1);
        }
    },
    preRender: function (data, plotRect, screenSize, dt, context) {
        if (!data.individualColors)
            context.fillStyle = data.color;
        if (data.border != null)
            context.strokeStyle = data.border;
        return data;
    },
    draw: function (marker, plotRect, screenSize, transform, context) {
        var x0 = transform.dataToScreenX(marker.x);
        var y0 = transform.dataToScreenY(marker.y);
        if (x0 > screenSize.width || x0 < 0) return;
        if (y0 > screenSize.height || y0 < 0) return;

        var maxSize = marker.size / 2;
        var minSize = maxSize * (1 - (marker.upper95 - marker.lower95) / marker.maxDelta);
        if (marker.maxDelta <= 0) minSize = NaN;

        InteractiveDataDisplay.Petal.drawSample(context, x0, y0, minSize, maxSize, marker.color);
    },
    drawSample: function (context, x, y, minSize, maxSize, color) {
        var A, D;
        var C = Math.random() * Math.PI * 2;
        if (isNaN(minSize)) {
            A = 0;
            D = maxSize;
            context.fillStyle = "rgba(0, 0, 0, 0.2)";
        }
        else {
            A = (maxSize - minSize) / 2;
            D = (maxSize + minSize) / 2;
            context.fillStyle = color;
        }
        context.strokeStyle = "black";

        context.beginPath();
        var n = 1000;
        var alpha = Math.PI * 2 / n;
        for (var i = 0; i < n; i++) {
            var phi = alpha * i;
            var r = A * Math.sin(6 * phi + C) + D;
            if (i == 0)
                context.moveTo(x + r * Math.cos(phi), y + r * Math.sin(phi));
            else
                context.lineTo(x + r * Math.cos(phi), y + r * Math.sin(phi));
        }
        context.stroke();
        context.closePath();
        context.fill();

        context.strokeStyle = "gray";
        context.beginPath();
        context.arc(x, y, 1, 0, Math.PI * 2);
        context.stroke();
        context.closePath();
    },
    hitTest: function (marker, transform, ps, pd) {
        var x = transform.dataToScreenX(marker.x);
        var y = transform.dataToScreenY(marker.y);
        var r = marker.size / 2;
        if (ps.x < x - r || ps.x > x + r) return false;
        if (ps.y < y - r || ps.y > y + r) return false;
        return true;
    },
    getLegend: function (data, getTitle, legendDiv) { // todo: should be refactored            
        var itemDiv = legendDiv.content;
        var fontSize = 14;
        if (document.defaultView && document.defaultView.getComputedStyle) {
            fontSize = parseFloat(document.defaultView.getComputedStyle(itemDiv[0], null).getPropertyValue("font-size"));
        }
        if (isNaN(fontSize) || fontSize == 0) fontSize = 14;

        var canvas = legendDiv.thumbnail;
        var canvasIsVisible = true;
        var maxSize = fontSize * 1.5;
        var x1 = maxSize / 2 + 1;
        var y1 = maxSize / 2 + 1;
        canvas[0].width = canvas[0].height = maxSize + 2;
        var canvasStyle = canvas[0].style;
        var context = canvas.get(0).getContext("2d");
        context.clearRect(0, 0, canvas[0].width, canvas[0].height);

        var color, border, drawBorder;
        var colorDiv, colorDivStyle, colorControl;
        var colorIsVisible = 0;

        var size, halfSize;
        var sizeDiv, sizeDivStyle, sizeControl;
        var sizeIsVisible = 0;

        var sizeTitle;
        var refreshSize = function () {
            size = maxSize;
            var szTitleText = getTitle("size");
            if (sizeIsVisible == 0) {
                sizeDiv = $("<div style='width: 170px; margin-top: 5px; margin-bottom: 5px'></div>").appendTo(itemDiv);
                sizeTitle = $("<div class='idd-legend-item-property'></div>").text(szTitleText).appendTo(sizeDiv);
                sizeDivStyle = sizeDiv[0].style;
                var paletteDiv = $("<div style='width: 170px;'></div>").appendTo(sizeDiv);
                sizeControl = new InteractiveDataDisplay.UncertaintySizePaletteViewer(paletteDiv);
                sizeIsVisible = 2;
            } else {
                sizeTitle.text(szTitleText);
            }
            halfSize = size / 2;
        };

        var colorTitle;
        var refreshColor = function () {
            drawBorder = false;
            if (data.individualColors && data.colorPalette) {
                var clrTitleText = getTitle("color");
                if (colorIsVisible == 0) {
                    colorDiv = $("<div style='width: 170px; margin-top: 5px; margin-bottom: 5px'></div>").appendTo(itemDiv);
                    colorTitle = $("<div class='idd-legend-item-property'></div>").text(clrTitleText).appendTo(colorDiv);
                    colorDivStyle = colorDiv[0].style;
                    var paletteDiv = $("<div style='width: 170px;'></div>").appendTo(colorDiv);
                    colorControl = new InteractiveDataDisplay.ColorPaletteViewer(paletteDiv);
                    colorIsVisible = 2;
                } else {
                    colorTitle.text(clrTitleText);
                }
                colorControl.palette = data.colorPalette;
                if (colorIsVisible == 1) {
                    colorDivStyle.display = "block";
                    colorIsVisible = 2;
                }
            }
            else {
                if (colorIsVisible == 2) {
                    colorDivStyle.display = "none";
                    colorIsVisible = 1;
                }
            }
            if (data.individualColors) {
                border = "#000000";
                color = "#ffffff";
                drawBorder = true;
            }
            else {
                color = data.color;
                border = color;
                if (data.border != null) {
                    drawBorder = true;
                    border = data.border;
                }
            }
        };

        var renderShape = function () {
            var sampleColor = "gray";
            var sampleBorderColor = "gray";

            InteractiveDataDisplay.Petal.drawSample(context, x1, y1, halfSize / 2, halfSize, sampleColor);
        };

        refreshColor();
        refreshSize();
        renderShape();
    },
    getTooltipData: function (originalData, index) {
        var dataRow = {};
        if (InteractiveDataDisplay.Utils.isArray(originalData.x) && index < originalData.x.length) 
            dataRow['x'] = originalData.x[index];
        if (InteractiveDataDisplay.Utils.isArray(originalData.y) && index < originalData.y.length) 
            dataRow['y'] = originalData.y[index];
        if (InteractiveDataDisplay.Utils.isArray(originalData.color) && index < originalData.color.length)
            dataRow['color'] = originalData.color[index];
        if (originalData.size) {
            dataRow['size'] = {};
            if (InteractiveDataDisplay.Utils.isArray(originalData.size.lower95) && index < originalData.size.lower95.length)
                dataRow['size']["lower 95%"] = originalData.size.lower95[index];
            if (InteractiveDataDisplay.Utils.isArray(originalData.size.upper95) && index < originalData.size.upper95.length)
                dataRow['size']["upper 95%"] = originalData.size.upper95[index];
        }
        dataRow["index"] = index;
        return dataRow;
    }
};
InteractiveDataDisplay.BullEye = {
    prepare: function (data) {
        data.bullEyeShape = data.bullEyeShape ? data.bullEyeShape.toLowerCase() : "circle";
        // y
        if (data.y == undefined || data.y == null) throw "The mandatory property 'y' is undefined or null";
        if (!InteractiveDataDisplay.Utils.isArray(data.y)) throw "The property 'y' must be an array of numbers";
        var n = data.y.length;

        var mask = new Int8Array(n);
        InteractiveDataDisplay.Utils.maskNaN(mask, data.y);

        // x
        if (data.x == undefined)
            data.x = InteractiveDataDisplay.Utils.range(0, n - 1);
        else if (!InteractiveDataDisplay.Utils.isArray(data.x)) throw "The property 'x' must be an array of numbers";
        else if (data.x.length != n) throw "Length of the array which is a value of the property 'x' differs from lenght of 'y'"
        else InteractiveDataDisplay.Utils.maskNaN(mask, data.x);

        // border
        if (data.border == undefined || data.border == "none")
            data.border = null; // no border

        // colors        
        if (InteractiveDataDisplay.Utils.isArray(data.color.lower95) && InteractiveDataDisplay.Utils.isArray(data.color.upper95)) {
            if (data.color.lower95.length != n && data.color.upper95.length != n) throw "Length of the array 'color' is different than length of the array 'y'"
            if (n > 0 && typeof (data.color.lower95[0]) === "number" && typeof (data.color.upper95[0]) === "number") { // color is a data series                 
                var palette = data.colorPalette;
                if (palette == undefined) palette = InteractiveDataDisplay.Markers.defaults.colorPalette;
                if (typeof palette == 'string') palette = new InteractiveDataDisplay.ColorPalette.parse(palette);
                if (palette != undefined && palette.isNormalized) {
                    var r = { min: InteractiveDataDisplay.Utils.getMin(data.color.lower95), max: InteractiveDataDisplay.Utils.getMax(data.color.upper95) };
                    r = InteractiveDataDisplay.Utils.makeNonEqual(r);
                    data.colorPalette = palette = palette.absolute(r.min, r.max);
                }
                var colors_u95 = [];
                var colors_l95 = [];
                for (var i = 0; i < n; i++){
                    var color_u95 = data.color.upper95[i];
                    var color_l95 = data.color.lower95[i];
                    if (color_u95 != color_u95 || color_l95 != color_l95)
                        mask[i] = 1;
                    else {
                        var u95rgba = palette.getRgba(color_u95);
                        var l95rgba = palette.getRgba(color_l95);
                        colors_u95[i] = "rgba(" + u95rgba.r + "," + u95rgba.g + "," + u95rgba.b + "," + u95rgba.a + ")";
                        colors_l95[i] = "rgba(" + l95rgba.r + "," + l95rgba.g + "," + l95rgba.b + "," + l95rgba.a + ")";
                    }
                }
                data.upper95 = colors_u95;
                data.lower95 = colors_l95;
            }
            data.individualColors = true;
        } else {
            data.individualColors = false;
        }

        // sizes    
        var sizes = new Array(n);
        if (data.size == undefined) data.size = InteractiveDataDisplay.Markers.defaults.size;
        if (InteractiveDataDisplay.Utils.isArray(data.size)) {
            if (data.size.length != n) throw "Length of the array 'size' is different than length of the array 'y'"
            if (data.sizePalette != undefined) { // 'size' is a data series 
                var palette = data.sizePalette;
                if (palette.isNormalized) {
                    var r = InteractiveDataDisplay.Utils.getMinMax(data.size);
                    r = InteractiveDataDisplay.Utils.makeNonEqual(r);
                    data.sizePalette = palette = new InteractiveDataDisplay.SizePalette(false, palette.sizeRange, r);
                }
                for (var i = 0; i < n; i++) {
                    var size = data.size[i];
                    if (size != size) // NaN
                        mask[i] = 1;
                    else
                        sizes[i] = palette.getSize(size)
                }
            } else { // 'size' contains values in pixels
                data.sizeMax = InteractiveDataDisplay.Utils.getMax(data.size);
            }
        } else { // sizes is a constant
            for (var i = 0; i < n; i++) sizes[i] = data.size;
            data.sizeMax = data.size;
        }
        data.size = sizes;

        // Filtering out missing values
        var m = 0;
        for (var i = 0; i < n; i++) if (mask[i] === 1) m++;
        if (m > 0) { // there are missing values
            m = n - m;
            data.x = InteractiveDataDisplay.Utils.applyMask(mask, data.x, m);
            data.y = InteractiveDataDisplay.Utils.applyMask(mask, data.y, m);
            data.size = InteractiveDataDisplay.Utils.applyMask(mask, data.size, m);
            if (data.individualColors) {
                data.upper95 = InteractiveDataDisplay.Utils.applyMask(mask, data.upper95, m);
                data.lower95 = InteractiveDataDisplay.Utils.applyMask(mask, data.lower95, m);
            }
            var indices = Array(m);
            for (var i = 0, j = 0; i < n; i++) if (mask[i] === 0) indices[j++] = i;
            data.indices = indices;
        } else {
            data.indices = InteractiveDataDisplay.Utils.range(0, n - 1);
        }
    },
    preRender: function (data, plotRect, screenSize, dt, context) {
        if(data.border != null)
            context.strokeStyle = data.border;
        return data;
    },
    draw: function (marker, plotRect, screenSize, transform, context) {

          var mean = marker.y_mean;
          var u95 = marker.upper95;
          var l95 = marker.lower95;

          var msize = marker.size;
          var shift = msize / 2;
          var x = transform.dataToScreenX(marker.x);
          var y = transform.dataToScreenY(marker.y);

          if (x + shift < 0 || x - shift > screenSize.width) return;
          if (y + shift < 0 || y - shift > screenSize.height) return;
          InteractiveDataDisplay.BullEye.drawBullEye(context, marker.bullEyeShape, x, y, msize, msize, u95);
          InteractiveDataDisplay.BullEye.drawBullEye(context, marker.bullEyeShape, x, y, shift, shift, l95);
    },
    drawBullEye: function(context, shape, x, y, width, height, fill, stroke) {
        var w = width;
        var h = height;
        var useStroke = stroke !== "none";
        context.strokeStyle = stroke !== undefined ? stroke : "black";
        context.fillStyle = fill !== undefined ? fill : "black";

        var x1 = x;
        var y1 = y;

        var size = Math.min(w, h);
        var halfSize = 0.5 * size;
        var quarterSize = 0.5 * halfSize;

        context.clearRect(0, 0, w, h);
        switch (shape) {
            case "box": // box                
                if (useStroke) context.strokeRect(x1 - halfSize, y1 - halfSize, size, size);
                context.fillRect(x1 - halfSize, y1 - halfSize, size, size);
                break;
            case "circle": // circle
                context.beginPath();
                context.arc(x1, y1, halfSize, 0, 2 * Math.PI);
                if (useStroke) context.stroke();
                context.fill();
                break;
            case "diamond": // diamond
                context.beginPath();
                context.moveTo(x1 - halfSize, y1);
                context.lineTo(x1, y1 - halfSize);
                context.lineTo(x1 + halfSize, y1);
                context.lineTo(x1, y1 + halfSize);
                context.closePath();
                if (useStroke) context.stroke();
                context.fill();
                break;
            case "cross": // cross
                var thirdSize = size / 3;
                var halfThirdSize = thirdSize / 2;
                context.beginPath();
                context.moveTo(x1 - halfSize, y1 - halfThirdSize);
                context.lineTo(x1 - halfThirdSize, y1 - halfThirdSize);
                context.lineTo(x1 - halfThirdSize, y1 - halfSize);
                context.lineTo(x1 + halfThirdSize, y1 - halfSize);
                context.lineTo(x1 + halfThirdSize, y1 - halfThirdSize);
                context.lineTo(x1 + halfSize, y1 - halfThirdSize);
                context.lineTo(x1 + halfSize, y1 + halfThirdSize);
                context.lineTo(x1 + halfThirdSize, y1 + halfThirdSize);
                context.lineTo(x1 + halfThirdSize, y1 + halfSize);
                context.lineTo(x1 - halfThirdSize, y1 + halfSize);
                context.lineTo(x1 - halfThirdSize, y1 + halfThirdSize);
                context.lineTo(x1 - halfSize, y1 + halfThirdSize);
                context.closePath();
                if (useStroke) context.stroke();
                context.fill();
                break;
            case "triangle": // triangle
                var r = Math.sqrt(3) / 6 * size;
                context.beginPath();
                context.moveTo(x1 - halfSize, y1 + r);
                context.lineTo(x1, y1 - r * 2);
                context.lineTo(x1 + halfSize, y1 + r);
                context.closePath();
                if (useStroke) context.stroke();
                context.fill();
                break;
        }
    },
    hitTest: function (marker, transform, ps, pd) {
          var xScreen = transform.dataToScreenX(marker.x);
          var yScreen = transform.dataToScreenY(marker.y);

          var isIntersecting =
              ps.x > xScreen - marker.size / 2 &&
              ps.x < xScreen + marker.size / 2 &&
              ps.y > yScreen - marker.size / 2 &&
              ps.y < yScreen + marker.size / 2;

          return isIntersecting;
      },
    getPadding: function (data) {
          var padding = 0;
          return { left: padding, right: padding, top: padding, bottom: padding };
      },
    getLegend: function (data, getTitle, legendDiv) { // todo: should be refactored            
          var itemDiv = legendDiv.content;
          var fontSize = 14;
          if (document.defaultView && document.defaultView.getComputedStyle) {
              fontSize = parseFloat(document.defaultView.getComputedStyle(itemDiv[0], null).getPropertyValue("font-size"));
          }
          if (isNaN(fontSize) || fontSize == 0) fontSize = 14;

          var canvas = legendDiv.thumbnail;
          var canvasIsVisible = true;
          var maxSize = fontSize * 1.5;
          var x1 = maxSize / 2 + 1;
          var y1 = maxSize / 2 + 1;
          canvas[0].width = canvas[0].height = maxSize + 2;
          var canvasStyle = canvas[0].style;
          var context = canvas.get(0).getContext("2d");
          context.clearRect(0, 0, canvas[0].width, canvas[0].height);

          var color, border, drawBorder;
          var colorDiv, colorDivStyle, colorControl;
          var colorIsVisible = 0;

          var size, halfSize;
          var sizeDiv, sizeDivStyle, sizeControl;
          var sizeIsVisible = 0;

          var sizeTitle;
          var refreshSize = function () {
              size = maxSize;
              if (data.sizePalette) {
                  var szTitleText = getTitle("size");
                  if (sizeIsVisible == 0) {
                      sizeDiv = $("<div style='width: 170px; margin-top: 5px; margin-bottom: 5px'></div>").appendTo(itemDiv);
                      sizeTitle = $("<div class='idd-legend-item-property'></div>").text(szTitleText).appendTo(sizeDiv);
                      sizeDivStyle = sizeDiv[0].style;
                      var paletteDiv = $("<div style='width: 170px;'></div>").appendTo(sizeDiv);
                      sizeControl = new InteractiveDataDisplay.SizePaletteViewer(paletteDiv);
                      sizeIsVisible = 2;
                  } else {
                      sizeTitle.text(szTitleText);
                  }
                  sizeControl.palette = data.sizePalette;
              }
              halfSize = size / 2;
          };

          var colorTitle;
          var refreshColor = function () {
              drawBorder = false;
              if (data.individualColors && data.colorPalette) {
                  var clrTitleText = getTitle("color");
                  if (colorIsVisible == 0) {
                      colorDiv = $("<div style='width: 170px; margin-top: 5px; margin-bottom: 5px'></div>").appendTo(itemDiv);
                      colorTitle = $("<div class='idd-legend-item-property'></div>").text(clrTitleText).appendTo(colorDiv);
                      colorDivStyle = colorDiv[0].style;
                      var paletteDiv = $("<div style='width: 170px;'></div>").appendTo(colorDiv);
                      colorControl = new InteractiveDataDisplay.ColorPaletteViewer(paletteDiv);
                      colorIsVisible = 2;
                  } else {
                      colorTitle.text(clrTitleText);
                  }
                  colorControl.palette = data.colorPalette;
                  if (colorIsVisible == 1) {
                      colorDivStyle.display = "block";
                      colorIsVisible = 2;
                  }
              }
              else {
                  if (colorIsVisible == 2) {
                      colorDivStyle.display = "none";
                      colorIsVisible = 1;
                  }
              }
              if (data.individualColors) {
                  border = "#000000";
                  color = "#ffffff";
                  drawBorder = true;
              }
              else {
                  color = data.color;
                  border = color;
                  if (data.border != null) {
                      drawBorder = true;
                      border = data.border;
                  }
              }
          };

          var renderShape = function () {
              var sampleColor = "gray";
              var sampleBorderColor = "gray";

              InteractiveDataDisplay.BullEye.drawBullEye(context, data.bullEyeShape, x1, y1, size, size, sampleColor, sampleBorderColor);
          };

          refreshColor();
          refreshSize();
          renderShape();
      },
    getTooltipData: function (originalData, index) {
        var dataRow = {};
        if (InteractiveDataDisplay.Utils.isArray(originalData.x) && index < originalData.x.length)
            dataRow['x'] = originalData.x[index];
        if (InteractiveDataDisplay.Utils.isArray(originalData.y) && index < originalData.y.length)
            dataRow['y'] = originalData.y[index];
        if (originalData.color) {
            dataRow['color'] = {};
            if (InteractiveDataDisplay.Utils.isArray(originalData.color.lower95) && index < originalData.color.lower95.length)
                dataRow['color']["lower 95%"] = originalData.color.lower95[index];
            if (InteractiveDataDisplay.Utils.isArray(originalData.color.upper95) && index < originalData.color.upper95.length)
                dataRow['color']["upper 95%"] = originalData.color.upper95[index];
        }
        if (InteractiveDataDisplay.Utils.isArray(originalData.size) && index < originalData.size.length)
            dataRow['size'] = originalData.size[index];
        dataRow["index"] = index;
        return dataRow;
    }
};

InteractiveDataDisplay.BoxWhisker = {
    prepare: function (data) {
        // y
        if (data.y.median == undefined || data.y.median == null) throw "The mandatory property 'y' is undefined or null";
        if (!InteractiveDataDisplay.Utils.isArray(data.y.median)) throw "The property 'y' must be an array of numbers";
        var n = data.y.median.length;

        var mask = new Int8Array(n);
        InteractiveDataDisplay.Utils.maskNaN(mask, data.y.median);
        data.y_mean = data.y.median;

        // x
        if (data.x == undefined)
            data.x = InteractiveDataDisplay.Utils.range(0, n - 1);
        else if (!InteractiveDataDisplay.Utils.isArray(data.x)) throw "The property 'x' must be an array of numbers";
        else if (data.x.length != n) throw "Length of the array which is a value of the property 'x' differs from lenght of 'y'"
        else InteractiveDataDisplay.Utils.maskNaN(mask, data.x);

        // border
        if (data.border == undefined || data.border == "none")
            data.border = null; // no border

        // colors        
        if (data.color == undefined) data.color = InteractiveDataDisplay.Markers.defaults.color;

        // sizes    
        var sizes = new Array(n);
        if (data.size == undefined) data.size = InteractiveDataDisplay.Markers.defaults.size;
        if (InteractiveDataDisplay.Utils.isArray(data.y.lower95) && InteractiveDataDisplay.Utils.isArray(data.y.upper95) &&
            InteractiveDataDisplay.Utils.isArray(data.y.lower68) && InteractiveDataDisplay.Utils.isArray(data.y.upper68)) {
            if (data.y.lower95.length != n && data.y.upper95.length != n && data.y.lower68.length != n && data.y.upper68.length != n)
                throw "Length of the array 'y' is different than length of the array 'y'";
            if (n > 0 && typeof (data.y.lower95[0]) === "number" && typeof (data.y.upper95[0]) === "number" && typeof (data.y.lower68[0]) === "number" && typeof (data.y.upper68[0]) === "number") { // color is a data series                 
                var ys_u95 = [];
                var ys_l95 = [];
                var ys_u68 = [];
                var ys_l68 = [];
                for (var i = 0; i < n; i++) {
                    var y_u95 = data.y.upper95[i];
                    var y_l95 = data.y.lower95[i];
                    var y_u68 = data.y.upper68[i];
                    var y_l68 = data.y.lower68[i];
                    if (y_u95 != y_u95 || y_l95 != y_l95 || y_u68 != y_u68 || y_l68 != y_l68)
                        mask[i] = 1;
                    else {
                        ys_u95[i] = data.y.upper95[i];
                        ys_l95[i] = data.y.lower95[i];
                        ys_u68[i] = data.y.upper68[i];
                        ys_l68[i] = data.y.lower68[i];
                    }
                }
                data.upper95 = ys_u95;
                data.lower95 = ys_l95;
                data.upper68 = ys_u68;
                data.lower68 = ys_l68;
            }
        }
        for (var i = 0; i < n; i++) sizes[i] = data.size;
        data.sizeMax = data.size;
        data.size = sizes;

        // Filtering out missing values
        var m = 0;
        for (var i = 0; i < n; i++) if (mask[i] === 1) m++;
        if (m > 0) { // there are missing values
            m = n - m;
            data.x = InteractiveDataDisplay.Utils.applyMask(mask, data.x, m);
            data.y_mean = InteractiveDataDisplay.Utils.applyMask(mask, data.y_mean, m);
            data.size = InteractiveDataDisplay.Utils.applyMask(mask, data.size, m);
            data.upper95 = InteractiveDataDisplay.Utils.applyMask(mask, data.upper95, m);
            data.lower95 = InteractiveDataDisplay.Utils.applyMask(mask, data.lower95, m);
            data.upper68 = InteractiveDataDisplay.Utils.applyMask(mask, data.upper68, m);
            data.lower68 = InteractiveDataDisplay.Utils.applyMask(mask, data.lower68, m);

            var indices = Array(m);
            for (var i = 0, j = 0; i < n; i++) if (mask[i] === 0) indices[j++] = i;
            data.indices = indices;
        } else {
            data.indices = InteractiveDataDisplay.Utils.range(0, n - 1);
        }
    },
    preRender: function (data, plotRect, screenSize, dt, context) {
        context.fillStyle = data.color;
        if (data.border != null)
            context.strokeStyle = data.border;
        return data;
    },
    draw: function (marker, plotRect, screenSize, transform, context) {

        var msize = marker.size;
        var shift = msize / 2;
        var x = transform.dataToScreenX(marker.x);
        var y = transform.dataToScreenY(marker.y_mean);
        var u68 = transform.dataToScreenY(marker.upper68);
        var l68 = transform.dataToScreenY(marker.lower68);
        var u95 = transform.dataToScreenY(marker.upper95);
        var l95 = transform.dataToScreenY(marker.lower95);
        var mean = transform.dataToScreenY(marker.y_mean);

        context.beginPath();
        context.strokeStyle = marker.border === undefined ? "black" : marker.border;

        if (marker.color) context.fillRect(x - shift, l68, msize, u68 - l68);
        context.strokeRect(x - shift, l68, msize, u68 - l68);

        context.moveTo(x - shift, u95);
        context.lineTo(x + shift, u95);

        context.moveTo(x, u95);
        context.lineTo(x, u68);

        context.moveTo(x, l68);
        context.lineTo(x, l95);

        context.moveTo(x - shift, l95);
        context.lineTo(x + shift, l95);

        context.moveTo(x - shift, mean);
        context.lineTo(x + shift, mean);

        context.stroke();

        if (marker.y_min !== undefined) {
            context.beginPath();
            context.arc(x, transform.dataToScreenY(marker.y_min), shift / 2, 0, 2 * Math.PI);
            context.stroke();
        }

        if (marker.y_max !== undefined) {
            context.beginPath();
            context.arc(x, transform.dataToScreenY(marker.y_max), shift / 2, 0, 2 * Math.PI);
            context.stroke();
        }
    },
    hitTest: function (marker, transform, ps, pd) {
        var xScreen = transform.dataToScreenX(marker.x);

        var ymax = transform.dataToScreenY(marker.y_min === undefined ? marker.lower95 : marker.y_min);
        var ymin = transform.dataToScreenY(marker.y_max === undefined ? marker.upper95 : marker.y_max);

        var isIntersecting =
            ps.x > xScreen - marker.size / 2 &&
            ps.x < xScreen + marker.size / 2 &&
            ps.y > ymin &&
            ps.y < ymax;

        return isIntersecting;
    },
    getPadding: function (data) {
        var padding = 0;
        return { left: padding, right: padding, top: padding, bottom: padding };
    },
    getLegend: function (data, getTitle, legendDiv) { // todo: should be refactored            
        var itemDiv = legendDiv.content;
        var fontSize = 14;
        if (document.defaultView && document.defaultView.getComputedStyle) {
            fontSize = parseFloat(document.defaultView.getComputedStyle(itemDiv[0], null).getPropertyValue("font-size"));
        }
        if (isNaN(fontSize) || fontSize == 0) fontSize = 14;

        var canvas = legendDiv.thumbnail;
        var canvasIsVisible = true;
        var maxSize = fontSize * 1.5;
        var x1 = maxSize / 2 + 1;
        var y1 = maxSize / 2 + 1;
        canvas[0].width = canvas[0].height = maxSize + 2;
        var canvasStyle = canvas[0].style;
        var context = canvas.get(0).getContext("2d");
        var itemIsVisible = 0;

        var color, border, drawBorder;
        var colorDiv, colorDivStyle, colorControl;
        var colorIsVisible = 0;

        var size, halfSize;
        var sizeDiv, sizeDivStyle, sizeControl;
        var sizeIsVisible = 0;

        var sizeTitle;
        var refreshSize = function () {
            size = maxSize;
            if (data.sizePalette) {
                var szTitleText = getTitle("size");
                if (sizeIsVisible == 0) {
                    sizeDiv = $("<div style='width: 170px; margin-top: 5px; margin-bottom: 5px'></div>").appendTo(itemDiv);
                    sizeTitle = $("<div class='idd-legend-item-property'></div>").text(szTitleText).appendTo(sizeDiv);
                    sizeDivStyle = sizeDiv[0].style;
                    var paletteDiv = $("<div style='width: 170px;'></div>").appendTo(sizeDiv);
                    sizeControl = new InteractiveDataDisplay.SizePaletteViewer(paletteDiv);
                    sizeIsVisible = 2;
                } else {
                    sizeTitle.text(szTitleText);
                }
                sizeControl.palette = data.sizePalette;
            }
            halfSize = size / 2;
        };

        var colorTitle;
        var refreshColor = function () {
            drawBorder = false;
            if (data.individualColors && data.colorPalette) {
                var clrTitleText = getTitle("color");
                if (colorIsVisible == 0) {
                    colorDiv = $("<div style='width: 170px; margin-top: 5px; margin-bottom: 5px'></div>").appendTo(itemDiv);
                    colorTitle = $("<div class='idd-legend-item-property'></div>").text(clrTitleText).appendTo(colorDiv);
                    colorDivStyle = colorDiv[0].style;
                    var paletteDiv = $("<div style='width: 170px;'></div>").appendTo(colorDiv);
                    colorControl = new InteractiveDataDisplay.ColorPaletteViewer(paletteDiv);
                    colorIsVisible = 2;
                } else {
                    colorTitle.text(clrTitleText);
                }
                colorControl.palette = data.colorPalette;
                if (colorIsVisible == 1) {
                    colorDivStyle.display = "block";
                    colorIsVisible = 2;
                }
            }
            else {
                if (colorIsVisible == 2) {
                    colorDivStyle.display = "none";
                    colorIsVisible = 1;
                }
            }
            if (data.individualColors) {
                border = "#000000";
                color = "#ffffff";
                drawBorder = true;
            }
            else {
                color = data.color;
                border = color;
                if (data.border != null) {
                    drawBorder = true;
                    border = data.border;
                }
            }
        };

        var renderShape = function () {
            var sampleColor = typeof data.color == "string" ? data.color : "gray";
            var sampleBorderColor = typeof data.border == "string" ? data.border : "gray";
            var useStroke = sampleBorderColor !== "none";
            context.strokeStyle = sampleBorderColor !== undefined ? sampleBorderColor : "black";
            context.fillStyle = sampleColor !== undefined ? sampleColor : "black";

            var halfSize = 0.5 * size;
            var quarterSize = 0.5 * halfSize;

            context.clearRect(0, 0, size, size);
            context.fillRect(x1 - halfSize, y1 - quarterSize, size, halfSize);

            context.beginPath();
            context.moveTo(x1 - halfSize, y1 + halfSize);
            context.lineTo(x1 + halfSize, y1 + halfSize);
            context.moveTo(x1 - halfSize, y1 - halfSize);
            context.lineTo(x1 + halfSize, y1 - halfSize);
            context.moveTo(x1, y1 + halfSize);
            context.lineTo(x1, y1 + quarterSize);
            context.moveTo(x1, y1 - halfSize);
            context.lineTo(x1, y1 - quarterSize);
            context.closePath();
            if (useStroke) context.stroke();
            if (useStroke) context.strokeRect(x1 - halfSize, y1 - quarterSize, size, halfSize);

            if (useStroke) {
                context.beginPath();
                context.moveTo(x1 - halfSize, y1);
                context.lineTo(x1 + halfSize, y1);
                context.stroke();
            }
        };

        refreshColor();
        refreshSize();
        renderShape();
    },
    getTooltipData: function (originalData, index) {
        var dataRow = {};
        if (InteractiveDataDisplay.Utils.isArray(originalData.x) && index < originalData.x.length)
            dataRow['x'] = originalData.x[index];
        if (originalData.y) {
            dataRow['y'] = {};
            if (InteractiveDataDisplay.Utils.isArray(originalData.y.median) && index < originalData.y.median.length)
                dataRow['y']["median"] = originalData.y.median[index];
            if (InteractiveDataDisplay.Utils.isArray(originalData.y.lower95) && index < originalData.y.lower95.length)
                dataRow['y']["lower 95%"] = originalData.y.lower95[index];
            if (InteractiveDataDisplay.Utils.isArray(originalData.y.upper95) && index < originalData.y.upper95.length)
                dataRow['y']["upper 95%"] = originalData.y.upper95[index];
            if (InteractiveDataDisplay.Utils.isArray(originalData.y.lower68) && index < originalData.y.lower68.length)
                dataRow['y']["lower 68%"] = originalData.y.lower68[index];
            if (InteractiveDataDisplay.Utils.isArray(originalData.y.upper68) && index < originalData.y.upper68.length)
                dataRow['y']["upper 68%"] = originalData.y.upper68[index];
        }
        if (InteractiveDataDisplay.Utils.isArray(originalData.size) && index < originalData.size.length)
            dataRow['size'] = originalData.size[index];
        dataRow["index"] = index;
        return dataRow;
    }
};
InteractiveDataDisplay.BoxNoWhisker = {
    prepare: function (data) {
        // y
        if (data.y.median == undefined || data.y.median == null) throw "The mandatory property 'y' is undefined or null";
        if (!InteractiveDataDisplay.Utils.isArray(data.y.median)) throw "The property 'y' must be an array of numbers";
        var n = data.y.median.length;

        var mask = new Int8Array(n);
        InteractiveDataDisplay.Utils.maskNaN(mask, data.y.median);
        data.y_mean = data.y.median;

        // x
        if (data.x == undefined)
            data.x = InteractiveDataDisplay.Utils.range(0, n - 1);
        else if (!InteractiveDataDisplay.Utils.isArray(data.x)) throw "The property 'x' must be an array of numbers";
        else if (data.x.length != n) throw "Length of the array which is a value of the property 'x' differs from lenght of 'y'"
        else InteractiveDataDisplay.Utils.maskNaN(mask, data.x);

        // border
        if (data.border == undefined || data.border == "none")
            data.border = null; // no border

        // colors        
        if (data.color == undefined) data.color = InteractiveDataDisplay.Markers.defaults.color;

        // sizes    
        var sizes = new Array(n);
        if (data.size == undefined) data.size = InteractiveDataDisplay.Markers.defaults.size;
        if (InteractiveDataDisplay.Utils.isArray(data.y.lower68) && InteractiveDataDisplay.Utils.isArray(data.y.upper68)) {
            if (data.y.lower68.length != n && data.y.upper68.length != n)
                throw "Length of the array 'y' is different than length of the array 'y'";
            if (n > 0 && typeof (data.y.lower68[0]) === "number" && typeof (data.y.upper68[0]) === "number") { // color is a data series                 
                var ys_u68 = [];
                var ys_l68 = [];
                for (var i = 0; i < n; i++) {
                    var y_u68 = data.y.upper68[i];
                    var y_l68 = data.y.lower68[i];
                    if (y_u68 != y_u68 || y_l68 != y_l68)
                        mask[i] = 1;
                    else {
                        ys_u68[i] = data.y.upper68[i];
                        ys_l68[i] = data.y.lower68[i];
                    }
                }
                data.upper68 = ys_u68;
                data.lower68 = ys_l68;
            }
        }
        for (var i = 0; i < n; i++) sizes[i] = data.size;
        data.sizeMax = data.size;
        data.size = sizes;

        // Filtering out missing values
        var m = 0;
        for (var i = 0; i < n; i++) if (mask[i] === 1) m++;
        if (m > 0) { // there are missing values
            m = n - m;
            data.x = InteractiveDataDisplay.Utils.applyMask(mask, data.x, m);
            data.y_mean = InteractiveDataDisplay.Utils.applyMask(mask, data.y_mean, m);
            data.size = InteractiveDataDisplay.Utils.applyMask(mask, data.size, m);
            data.upper68 = InteractiveDataDisplay.Utils.applyMask(mask, data.upper68, m);
            data.lower68 = InteractiveDataDisplay.Utils.applyMask(mask, data.lower68, m);
            var indices = Array(m);
            for (var i = 0, j = 0; i < n; i++) if (mask[i] === 0) indices[j++] = i;
            data.indices = indices;
        } else {
            data.indices = InteractiveDataDisplay.Utils.range(0, n - 1);
        }
    },
    preRender: function (data, plotRect, screenSize, dt, context) {
        context.fillStyle = data.color;
        if (data.border != null)
            context.strokeStyle = data.border;
        return data;
    },
    draw: function (marker, plotRect, screenSize, transform, context) {

                var msize = marker.size;
                var shift = msize / 2;
                var x = transform.dataToScreenX(marker.x);
                var y = transform.dataToScreenY(marker.y_mean);
                var u68 = transform.dataToScreenY(marker.upper68);
                var l68 = transform.dataToScreenY(marker.lower68);
                var mean = transform.dataToScreenY(marker.y_mean);

                context.beginPath();
                context.strokeStyle = marker.border === undefined ? "black" : marker.border;

                if (marker.color) context.fillRect(x - shift, l68, msize, u68 - l68);
                context.strokeRect(x - shift, l68, msize, u68 - l68);

                context.moveTo(x - shift, mean);
                context.lineTo(x + shift, mean);

                context.stroke();

                if (marker.y_min !== undefined) {
                    context.beginPath();
                    context.arc(x, transform.dataToScreenY(marker.y_min), shift / 2, 0, 2 * Math.PI);
                    context.stroke();
                }

                if (marker.y_max !== undefined) {
                    context.beginPath();
                    context.arc(x, transform.dataToScreenY(marker.y_max), shift / 2, 0, 2 * Math.PI);
                    context.stroke();
                }
            },
    hitTest: function (marker, transform, ps, pd) {
                var xScreen = transform.dataToScreenX(marker.x);

                var ymax = transform.dataToScreenY(marker.y_min === undefined ? marker.lower95 : marker.y_min);
                var ymin = transform.dataToScreenY(marker.y_max === undefined ? marker.upper95 : marker.y_max);

                var isIntersecting =
                    ps.x > xScreen - marker.size / 2 &&
                    ps.x < xScreen + marker.size / 2 &&
                    ps.y > ymin &&
                    ps.y < ymax;

                return isIntersecting;
            },
    getPadding: function (data) {
                var padding = 0;
                return { left: padding, right: padding, top: padding, bottom: padding };
    },
    getLegend: function (data, getTitle, legendDiv) { // todo: should be refactored            
        var itemDiv = legendDiv.content;
        var fontSize = 14;
        if (document.defaultView && document.defaultView.getComputedStyle) {
            fontSize = parseFloat(document.defaultView.getComputedStyle(itemDiv[0], null).getPropertyValue("font-size"));
        }
        if (isNaN(fontSize) || fontSize == 0) fontSize = 14;

        var canvas = legendDiv.thumbnail;
        var canvasIsVisible = true;
        var maxSize = fontSize * 1.5;
        var x1 = maxSize / 2 + 1;
        var y1 = maxSize / 2 + 1;
        canvas[0].width = canvas[0].height = maxSize + 2;
        var canvasStyle = canvas[0].style;
        var context = canvas.get(0).getContext("2d");
        context.clearRect(0, 0, canvas[0].width, canvas[0].height);

        var color, border, drawBorder;
        var colorDiv, colorDivStyle, colorControl;
        var colorIsVisible = 0;

        var size, halfSize;
        var sizeDiv, sizeDivStyle, sizeControl;
        var sizeIsVisible = 0;

        var sizeTitle;
        var refreshSize = function () {
            size = maxSize;
            if (data.sizePalette) {
                var szTitleText = getTitle("size");
                if (sizeIsVisible == 0) {
                    sizeDiv = $("<div style='width: 170px; margin-top: 5px; margin-bottom: 5px'></div>").appendTo(itemDiv);
                    sizeTitle = $("<div class='idd-legend-item-property'></div>").text(szTitleText).appendTo(sizeDiv);
                    sizeDivStyle = sizeDiv[0].style;
                    var paletteDiv = $("<div style='width: 170px;'></div>").appendTo(sizeDiv);
                    sizeControl = new InteractiveDataDisplay.SizePaletteViewer(paletteDiv);
                    sizeIsVisible = 2;
                } else {
                    sizeTitle.text(szTitleText);
                }
                sizeControl.palette = data.sizePalette;
            }
            halfSize = size / 2;
        };

        var colorTitle;
        var refreshColor = function () {
            drawBorder = false;
            if (data.individualColors && data.colorPalette) {
                var clrTitleText = getTitle("color");
                if (colorIsVisible == 0) {
                    colorDiv = $("<div style='width: 170px; margin-top: 5px; margin-bottom: 5px'></div>").appendTo(itemDiv);
                    colorTitle = $("<div class='idd-legend-item-property'></div>").text(clrTitleText).appendTo(colorDiv);
                    colorDivStyle = colorDiv[0].style;
                    var paletteDiv = $("<div style='width: 170px;'></div>").appendTo(colorDiv);
                    colorControl = new InteractiveDataDisplay.ColorPaletteViewer(paletteDiv);
                    colorIsVisible = 2;
                } else {
                    colorTitle.text(clrTitleText);
                }
                colorControl.palette = data.colorPalette;
                if (colorIsVisible == 1) {
                    colorDivStyle.display = "block";
                    colorIsVisible = 2;
                }
            }
            else {
                if (colorIsVisible == 2) {
                    colorDivStyle.display = "none";
                    colorIsVisible = 1;
                }
            }
            if (data.individualColors) {
                border = "#000000";
                color = "#ffffff";
                drawBorder = true;
            }
            else {
                color = data.color;
                border = color;
                if (data.border != null) {
                    drawBorder = true;
                    border = data.border;
                }
            }
        };

        var renderShape = function () {
            var sampleColor = typeof data.color == "string" ? data.color : "gray";
            var sampleBorderColor = typeof data.border == "string" ? data.border : "gray";

            var useStroke = sampleBorderColor !== "none";
            context.strokeStyle = sampleBorderColor !== undefined ? sampleBorderColor : "black";
            context.fillStyle = sampleColor !== undefined ? sampleColor : "black";

            var halfSize = 0.5 * size;
            var quarterSize = 0.5 * halfSize;

            context.clearRect(0, 0, size, size);
            context.fillRect(x1 - halfSize, y1 - halfSize, size, size);

            if (useStroke) context.strokeRect(x1 - halfSize, y1 - halfSize, size, size);
            context.beginPath();
            context.moveTo(x1 - halfSize, y1);
            context.lineTo(x1 + halfSize, y1);
            context.closePath();
            if (useStroke) context.stroke();
        };

        refreshColor();
        refreshSize();
        renderShape();
    },
    getTooltipData: function (originalData, index) {
        var dataRow = {};
        if (InteractiveDataDisplay.Utils.isArray(originalData.x) && index < originalData.x.length)
            dataRow['x'] = originalData.x[index];
        if (originalData.y) {
            dataRow['y'] = {};
            if (InteractiveDataDisplay.Utils.isArray(originalData.y.median) && index < originalData.y.median.length)
                dataRow['y']["median"] = originalData.y.median[index];
            if (InteractiveDataDisplay.Utils.isArray(originalData.y.lower68) && index < originalData.y.lower68.length)
                dataRow['y']["lower 68%"] = originalData.y.lower68[index];
            if (InteractiveDataDisplay.Utils.isArray(originalData.y.upper68) && index < originalData.y.upper68.length)
                dataRow['y']["upper 68%"] = originalData.y.upper68[index];
        }
        if (InteractiveDataDisplay.Utils.isArray(originalData.size) && index < originalData.size.length)
            dataRow['size'] = originalData.size[index];
        dataRow["index"] = index;
        return dataRow;
    }
};

InteractiveDataDisplay.Whisker = {
    prepare: function (data) {
        // y
        if (data.y.median == undefined || data.y.median == null) throw "The mandatory property 'y' is undefined or null";
        if (!InteractiveDataDisplay.Utils.isArray(data.y.median)) throw "The property 'y' must be an array of numbers";
        var n = data.y.median.length;

        var mask = new Int8Array(n);
        InteractiveDataDisplay.Utils.maskNaN(mask, data.y.median);
        data.y_mean = data.y.median;

        // x
        if (data.x == undefined)
            data.x = InteractiveDataDisplay.Utils.range(0, n - 1);
        else if (!InteractiveDataDisplay.Utils.isArray(data.x)) throw "The property 'x' must be an array of numbers";
        else if (data.x.length != n) throw "Length of the array which is a value of the property 'x' differs from lenght of 'y'"
        else InteractiveDataDisplay.Utils.maskNaN(mask, data.x);

        // border
        if (data.border == undefined || data.border == "none")
            data.border = null; // no border

        // colors        
        if (data.color == undefined) data.color = InteractiveDataDisplay.Markers.defaults.color;

        // sizes    
        var sizes = new Array(n);
        if (data.size == undefined) data.size = InteractiveDataDisplay.Markers.defaults.size;
        if (InteractiveDataDisplay.Utils.isArray(data.y.lower95) && InteractiveDataDisplay.Utils.isArray(data.y.upper95)) {
            if (data.y.lower95.length != n && data.y.upper95.length != n)
                throw "Length of the array 'y' is different than length of the array 'y'";
            if (n > 0 && typeof (data.y.lower95[0]) === "number" && typeof (data.y.upper95[0]) === "number") { // color is a data series                 
                var ys_u95 = [];
                var ys_l95 = [];
                for (var i = 0; i < n; i++) {
                    var y_u95 = data.y.upper95[i];
                    var y_l95 = data.y.lower95[i];
                    if (y_u95 != y_u95 || y_l95 != y_l95)
                        mask[i] = 1;
                    else {
                        ys_u95[i] = data.y.upper95[i];
                        ys_l95[i] = data.y.lower95[i];
                    }
                }
                data.upper95 = ys_u95;
                data.lower95 = ys_l95;
            }
        }
        for (var i = 0; i < n; i++) sizes[i] = data.size;
        data.sizeMax = data.size;
        data.size = sizes;

        // Filtering out missing values
        var m = 0;
        for (var i = 0; i < n; i++) if (mask[i] === 1) m++;
        if (m > 0) { // there are missing values
            m = n - m;
            data.x = InteractiveDataDisplay.Utils.applyMask(mask, data.x, m);
            data.y_mean = InteractiveDataDisplay.Utils.applyMask(mask, data.y_mean, m);
            data.size = InteractiveDataDisplay.Utils.applyMask(mask, data.size, m);
            data.upper95 = InteractiveDataDisplay.Utils.applyMask(mask, data.upper95, m);
            data.lower95 = InteractiveDataDisplay.Utils.applyMask(mask, data.lower95, m);
            var indices = Array(m);
            for (var i = 0, j = 0; i < n; i++) if (mask[i] === 0) indices[j++] = i;
            data.indices = indices;
        } else {
            data.indices = InteractiveDataDisplay.Utils.range(0, n - 1);
        }
    },
    preRender: function (data, plotRect, screenSize, dt, context) {
        context.fillStyle = data.color;
        if (data.border != null)
            context.strokeStyle = data.border;
        return data;
    },
    draw: function (marker, plotRect, screenSize, transform, context) {

                var msize = marker.size;
                var shift = msize / 2;
                var x = transform.dataToScreenX(marker.x);
                var y = transform.dataToScreenY(marker.y_mean);
                var u95 = transform.dataToScreenY(marker.upper95);
                var l95 = transform.dataToScreenY(marker.lower95);
                var mean = transform.dataToScreenY(marker.y_mean);

                context.beginPath();
                context.strokeStyle = marker.border === undefined ? "black" : marker.border;

                context.moveTo(x - shift, u95);
                context.lineTo(x + shift, u95);

                context.moveTo(x, u95);
                context.lineTo(x, l95);

                context.moveTo(x - shift, l95);
                context.lineTo(x + shift, l95);

                context.moveTo(x - shift, mean);
                context.lineTo(x + shift, mean);

                context.stroke();

                if (marker.y_min !== undefined) {
                    context.beginPath();
                    context.arc(x, transform.dataToScreenY(marker.y_min), shift / 2, 0, 2 * Math.PI);
                    context.stroke();
                }

                if (marker.y_max !== undefined) {
                    context.beginPath();
                    context.arc(x, transform.dataToScreenY(marker.y_max), shift / 2, 0, 2 * Math.PI);
                    context.stroke();
                }
            },
    hitTest: function (marker, transform, ps, pd) {
                var xScreen = transform.dataToScreenX(marker.x);

                var ymax = transform.dataToScreenY(marker.y_min === undefined ? marker.lower95 : marker.y_min);
                var ymin = transform.dataToScreenY(marker.y_max === undefined ? marker.upper95 : marker.y_max);

                var isIntersecting =
                    ps.x > xScreen - marker.size / 2 &&
                    ps.x < xScreen + marker.size / 2 &&
                    ps.y > ymin &&
                    ps.y < ymax;

                return isIntersecting;
            },
    getPadding: function (data) {
                var padding = 0;
                return { left: padding, right: padding, top: padding, bottom: padding };
    },
    getLegend: function (data, getTitle, legendDiv) { // todo: should be refactored            
        var itemDiv = legendDiv.content;
        var fontSize = 14;
        if (document.defaultView && document.defaultView.getComputedStyle) {
            fontSize = parseFloat(document.defaultView.getComputedStyle(itemDiv[0], null).getPropertyValue("font-size"));
        }
        if (isNaN(fontSize) || fontSize == 0) fontSize = 14;

        var canvas = legendDiv.thumbnail;
        var canvasIsVisible = true;
        var maxSize = fontSize * 1.5;
        var x1 = maxSize / 2 + 1;
        var y1 = maxSize / 2 + 1;
        canvas[0].width = canvas[0].height = maxSize + 2;
        var canvasStyle = canvas[0].style;
        var context = canvas.get(0).getContext("2d");
        context.clearRect(0, 0, canvas[0].width, canvas[0].height);

        var color, border, drawBorder;
        var colorDiv, colorDivStyle, colorControl;
        var colorIsVisible = 0;

        var size, halfSize;
        var sizeDiv, sizeDivStyle, sizeControl;
        var sizeIsVisible = 0;

        var sizeTitle;
        var refreshSize = function () {
            size = maxSize;
            if (data.sizePalette) {
                var szTitleText = getTitle("size");
                if (sizeIsVisible == 0) {
                    sizeDiv = $("<div style='width: 170px; margin-top: 5px; margin-bottom: 5px'></div>").appendTo(itemDiv);
                    sizeTitle = $("<div class='idd-legend-item-property'></div>").text(szTitleText).appendTo(sizeDiv);
                    sizeDivStyle = sizeDiv[0].style;
                    var paletteDiv = $("<div style='width: 170px;'></div>").appendTo(sizeDiv);
                    sizeControl = new InteractiveDataDisplay.SizePaletteViewer(paletteDiv);
                    sizeIsVisible = 2;
                } else {
                    sizeTitle.text(szTitleText);
                }
                sizeControl.palette = data.sizePalette;
            }
            halfSize = size / 2;
        };

        var colorTitle;
        var refreshColor = function () {
            drawBorder = false;
            if (data.individualColors && data.colorPalette) {
                var clrTitleText = getTitle("color");
                if (colorIsVisible == 0) {
                    colorDiv = $("<div style='width: 170px; margin-top: 5px; margin-bottom: 5px'></div>").appendTo(itemDiv);
                    colorTitle = $("<div class='idd-legend-item-property'></div>").text(clrTitleText).appendTo(colorDiv);
                    colorDivStyle = colorDiv[0].style;
                    var paletteDiv = $("<div style='width: 170px;'></div>").appendTo(colorDiv);
                    colorControl = new InteractiveDataDisplay.ColorPaletteViewer(paletteDiv);
                    colorIsVisible = 2;
                } else {
                    colorTitle.text(clrTitleText);
                }
                colorControl.palette = data.colorPalette;
                if (colorIsVisible == 1) {
                    colorDivStyle.display = "block";
                    colorIsVisible = 2;
                }
            }
            else {
                if (colorIsVisible == 2) {
                    colorDivStyle.display = "none";
                    colorIsVisible = 1;
                }
            }
            if (data.individualColors) {
                border = "#000000";
                color = "#ffffff";
                drawBorder = true;
            }
            else {
                color = data.color;
                border = color;
                if (data.border != null) {
                    drawBorder = true;
                    border = data.border;
                }
            }
        };

        var renderShape = function () {
            var sampleColor = typeof data.color == "string" ? data.color : "gray";
            var sampleBorderColor = typeof data.border == "string" ? data.border : "gray";

            var useStroke = sampleBorderColor !== "none";
            context.strokeStyle = sampleBorderColor !== undefined ? sampleBorderColor : "black";
            context.fillStyle = sampleColor !== undefined ? sampleColor : "black";

            var halfSize = 0.5 * size;
            var quarterSize = 0.5 * halfSize;

            context.clearRect(0, 0, size, size);

            if (useStroke) {
                context.beginPath();
                context.moveTo(x1 - halfSize, y1 + halfSize);
                context.lineTo(x1 + halfSize, y1 + halfSize);

                context.moveTo(x1 - halfSize, y1 - halfSize);
                context.lineTo(x1 + halfSize, y1 - halfSize);

                context.moveTo(x1 - halfSize, y1);
                context.lineTo(x1 + halfSize, y1);

                context.moveTo(x1, y1 + halfSize);
                context.lineTo(x1, y1 - halfSize);

                context.stroke();
            }
        };

        refreshColor();
        refreshSize();
        renderShape();
        return { thumbnail: canvas, content: itemDiv };
    },
    getTooltipData: function (originalData, index) {
        var dataRow = {};
        if (InteractiveDataDisplay.Utils.isArray(originalData.x) && index < originalData.x.length)
            dataRow['x'] = originalData.x[index];
        if (originalData.y) {
            dataRow['y'] = {};
            if (InteractiveDataDisplay.Utils.isArray(originalData.y.median) && index < originalData.y.median.length)
                dataRow['y']["median"] = originalData.y.median[index];
            if (InteractiveDataDisplay.Utils.isArray(originalData.y.lower95) && index < originalData.y.lower95.length)
                dataRow['y']["lower 95%"] = originalData.y.lower95[index];
            if (InteractiveDataDisplay.Utils.isArray(originalData.y.upper95) && index < originalData.y.upper95.length)
                dataRow['y']["upper 95%"] = originalData.y.upper95[index];
        }
        if (InteractiveDataDisplay.Utils.isArray(originalData.size) && index < originalData.size.length)
            dataRow['size'] = originalData.size[index];
        dataRow["index"] = index;
        return dataRow;
    }
};
InteractiveDataDisplay.Markers.shapes["boxwhisker"] = InteractiveDataDisplay.BoxWhisker;
InteractiveDataDisplay.Markers.shapes["boxnowhisker"] = InteractiveDataDisplay.BoxNoWhisker;
InteractiveDataDisplay.Markers.shapes["whisker"] = InteractiveDataDisplay.Whisker;
InteractiveDataDisplay.Markers.shapes["petals"] = InteractiveDataDisplay.Petal;
InteractiveDataDisplay.Markers.shapes["bulleye"] = InteractiveDataDisplay.BullEye;
