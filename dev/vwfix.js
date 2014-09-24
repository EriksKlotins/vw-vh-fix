
// [todo]
/*
	2. uzlikt ierobežojumu, lai šis sāk darboties tikai uz vajadzīgajiem browseriem
	*. Supports visiem media query nosacījumiem (nu vismaz lielākai daļai)
	3. GibHub + apraksts
	4. plugini
*/
;(function(window){


	if (typeof String.trim !== 'function')
	{
		String.prototype.trim = function()
		{
			 return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
		}
	}
	function getClientHeight()
	{
		return window.innerHeight ;
		//return Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
	}
	
	function getClientWidth()
	{
		return window.innerWidth;
		//return Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	}

	function reEngineerCSS(ruleModel)
	{
		var vw = getClientWidth();
		var vh = getClientHeight();
		var evaluateMediaQuery = function(mediaQueryStack)
		{
			if (mediaQueryStack.length==0) return true;
			var t0 = new Date().getTime();
			var result = true;
			
			for(var i=0;i<mediaQueryStack.length;i++)
			{
				//// console.log(mediaQueryStack[i]);
				mediaQueryStack[i].replace(/(max-width|min-width)([^)]+)/g, function(a,property,value)
				{

					value = value.match(/([0-9]+)px/)[1];
					switch (property)
					{
						case 'min-width':
							result = result && (vw >= value);
						break;
						case 'max-width':
							result = result && (vw <= value);
						break;
						default:
							// console.warn('Property ',property,' is not supported');
					}

				});
				if (!result) break;
			}
			var t1 = new Date().getTime();

			//// console.log('media ', mediaQueryStack, vw, result);
			return result;
		}



		var result = {}, currentRule = null;
		for(var i=0;i<ruleModel.length;i++)
		{
			var buf = '';
			for(var j=0;j<ruleModel[i].rules.length;j++)
			{
				currentRule = ruleModel[i].rules[j];
				var newVal = currentRule.value;
						
				switch(ruleModel[i].rules[j].unit)
				{
					case 'vw':
						newVal = currentRule.value * vw / 100;
					break;
					case 'vh':
						newVal = currentRule.value * vh / 100;
					break;
					case 'vmin':
						newVal = currentRule.value * Math.min(vh,vw) / 100;
					break;
					case 'vmax':
						newVal = currentRule.value * Math.max(vh,vw) / 100;
					break;

				}
			
				buf += currentRule.property + ':'+newVal+'px;';
			}
			buf = ruleModel[i].selector+'{'+buf+'}'; 
			var mediaBuf = ruleModel[i].media.slice(0);
			// te mēs visu saliekam assoc masīvā, lai izvairītos no tā, ka vienam selektoram ir vairāki
			// ieraksti. Te varētu būt bugi, ja nāk klāt jauni propertiji..
		
			var mediaQueryResult = evaluateMediaQuery(mediaBuf);
			//// console.log('herhe' ,mediaBuf,mediaQueryResult,buf);
			if (mediaQueryResult)
			{
				//result += buf + String.fromCharCode(13)+String.fromCharCode(10);
				result[ruleModel[i].selector] = buf;
			//	// console.log(buf);
				//// console.log(ruleModel[i].selector, buf);
			}
		}	
		
		var cssText = '';
		for(var i in result)
		{
			cssText+= result[i] + String.fromCharCode(13)+String.fromCharCode(10);
		}

		var t1 = new Date().getTime();
		return cssText;
	}



	function parseCSS(cssText)
	{
		var result = [], stackBuf = [];
		

		// this function takes string and attempts to parse out name: value;
		// this function should return only properties with further significance
		var parseRules = function(source)
		{
			var result = [];
			var t0 = new Date().getTime();
			source.replace(/([a-z-]+):([^;]+);/g, function(a,property,value)
			{
				value.replace(/([0-9-+.]+)(vw|vh|vmin|vmax)/, function(a,value,unit)
				{
					result.push({property:property, value:value, unit:unit});
				});
			});
			var t1 = new Date().getTime();
			//// console.log('Parse rules ', t1-t0,' ms');
			return result;
		}


		var walker = function(cssText)
		{		
			stackBuf.push({
				cssToParse: cssText,
				index: 0,
				mediaSelector : []
			});	
			while (stackBuf.length > 0)
			{
				var buf = '';
				var loopStart =  stackBuf[stackBuf.length-1].index;
				var cssToParse = stackBuf[stackBuf.length-1].cssToParse;
				var braceLevel = stackBuf.length - 1;
				var currentSelector = '';
				var mediaSelectorStack = (stackBuf.length>1) ? stackBuf[stackBuf.length-1].mediaSelector : [];
				
				//// console.log('braceLevel', braceLevel);
				if (braceLevel > 0)
				{
					// console.log(cssToParse);
				}
				//// console.log('css',cssToParse.length );


				for (var index=loopStart;index<cssToParse.length;index++)
				{
					var chr = cssToParse.charAt(index);
					if (braceLevel == 0)
					{
						if (chr == '{')
						{
							currentSelector = buf.trim();
							//// console.log('currentSelector = ', currentSelector);    
							buf = '{';
							braceLevel = 1;
							//// console.log('currentSelector ', currentSelector);
						}
						else
						{
							buf += chr;
						}
					}	
					else
					{
						buf += chr;
						if (chr == '{') braceLevel++;
						//if (chr == '}') braceLevel--;
						//if (braceLevel == 0)
						if (chr == '}') // sasniegtas kaut kāda bloka beigas
						{
							// console.log('crs', currentSelector);
							if (currentSelector.match(/@media/))
							{
								buf = buf.substr(1, buf.length-1);							
								stackBuf[stackBuf.length-1].index = index ;
								
								//currentSelector = currentSelector.replace(/}/,'' ).trim();
								mediaSelectorStack.push(currentSelector);
								// console.log('buf = ', buf.charAt(0));
								// // console.log(currentSelector);
								stackBuf.push({
										cssToParse: buf, 
										index:0, 
										mediaSelector:mediaSelectorStack 
									});
								break;
							}
							else
							{
								var rulesStr = buf.substr(1,buf.length-1).trim();
								var rulesArr = parseRules(rulesStr);
								if (rulesArr.length > 0)
								{
									var immediateResult = 
									{
										media 		: mediaSelectorStack.slice(0),
										selector 	: currentSelector,
										rules  		: rulesArr

									};
									// console.log(immediateResult);
									result.push(immediateResult);
								}
							}
							buf = '';
							currentSelector = '';
							braceLevel--;
						}
					}

					if (index == cssToParse.length-1)
					{
						
						//// console.log(stackBuf);
						//return;
						
						if (stackBuf.length > 0)
						{
							stackBuf.pop();
							//// console.log ('Setting index to: ',stackBuf[stackBuf.length-1].index )
							//// console.log(stackBuf);
							if (stackBuf.length>0)
							{
								index = stackBuf[stackBuf.length-1].index;
							}
							

						}
					//	// console.log('reached end of some block..', cssToParse);
						
						
					}
							
					
				}	

			} // while cauri iekavu līmeņiem

			
		}
		walker(cssText);
		// console.log('Model = ',result);
		return result;
	}

	var parseCSS = function(cssText)
	{


		// shift - izmet pirme
		// unshift - pieliek sākumā
		// push - pieliek beigās
		// pop - noņem no beigām

		var stack = [], mediaStack = [], buf = '', level = 0, levels = [];
		var parseRules = function(source)
		{
			var result = [];
			//var t0 = new Date().getTime();
			source.replace(/([a-z-]+):([^;]+);/g, function(a,property,value)
			{
				value.replace(/([0-9-+.]+)(vw|vh|vmin|vmax)/, function(a,value,unit)
				{
					result.push({property:property, value:value, unit:unit});
				});
			});
			//var t1 = new Date().getTime();
			//// console.log('Parse rules ', t1-t0,' ms');
			return result;
		}

		var stackPush = function(buf)
		{
			// te nāk selektori 

			buf = buf.trim();
			stack.push({selector : buf, rules : '', index:stack.length , media : mediaStack.slice(0)});
			if (buf.match(/@media/))
			{
				mediaStack.push(buf);
			}		
			levels[level] = stack[stack.length-1];
			level++;

		}
		var stackPop = function(buf)
		{
			buf = buf.trim();
			var matchingEl =  levels[level-1];
			if ( matchingEl.selector.match(/@media/))
			{
				stack.splice(matchingEl.index,1);
				mediaStack.pop();
			}
			else
			{
				matchingEl.rules = parseRules(buf);
				if (matchingEl.rules.length === 0)
				{
					stack.splice(matchingEl.index,1);
				}
			}	
			level--;
		}

		var tPush = 0;
			var tPop = 0;
			var t0, t1 = 0;
		for(var index=0;index<cssText.length;index++)
		{
			var chr = cssText.charAt(index);

			
			if (chr == '{')
			{
				t0 = new Date().getTime();
				stackPush(buf);
				buf = '';
				t1 = new Date().getTime();
				tPush += (t1 - t0);
			} 
			else if (chr == '}')
			{
				t0 = new Date().getTime();
				stackPop(buf);
				buf = '';
				t1 = new Date().getTime();
				tPop += (t1 - t0);
			}
			else
			{
				buf += chr;
			}
		}
		// console.log('Timing ', tPush, tPop);
		return stack;
	}




	function parseStyleSheet(cssText)
	{

		var t0 = new Date().getTime();
		var cssModel = parseCSS(cssText);
		var t1 = new Date().getTime();
		// console.info('parsing: ', t1-t0, ' ms');
		return cssModel;
	}


	/*











	*/

	var getXHRObject = function()
	{
		if (window.XMLHttpRequest) {
			return new XMLHttpRequest;
		}
		try	{ 
			return new ActiveXObject('Microsoft.XMLHTTP');
		} catch(e) { 
			return null;
		}
	}

	var getStyleSheets = function()
	{
		var result = [];
		for(var i=0;i<document.styleSheets.length;i++)
		{
			var href = document.styleSheets[i].href;
			if(href)
			{
				//// console.log(document.location);
				if (href.indexOf( window.location.protocol+"//"+window.location.host)===0)
				{
					result.push(href);
				}
				else
				{
					// console.log('Skipped: ', href);
				}
				
			}
			else
			{
				// console.warn('Inline styles not supported! Yet..')
			}
		}
		return result;
	}

	var loadStyleSheet = function(href)
	{

		var xhr = getXHRObject(), result = '';
		try
		{
			xhr.open("GET", href, false);
			xhr.send();
			result = (xhr.status==200) ? xhr.responseText : '';	
		}
		catch(e)
		{
			// // console.warn('Failed to load ', href);
		}
		
		result = result.replace(/(\/\*[^*]*\*+([^\/][^*]*\*+)*\/)\s*/g, '');
		// // console.log(href, result.substr(0,100));
		return result;
	}



	var lookupStyleNode = function()
	{
		var node = document.getElementById('vw-fix-style');
		if (!node)
		{
			node = document.createElement('style');
			node.type = 'text/css';
			node.id = 'vw-fix-style';
			
		} 
		while (node.firstChild) {node.removeChild(node.firstChild);}
		return node;
	}


	var sheets = getStyleSheets();
	var enginneredCSS = '';
	var model = [];
	for(var i=0;i<sheets.length;i++)
	{
		var t0 = new Date().getTime();
		var cssText = loadStyleSheet(sheets[i]);
		var t1 = new Date().getTime();

		// // console.log('Stylesheet loading: ', t1-t0, ' ms');
		model = model.concat(parseStyleSheet(cssText));
		
	}


	/*
		This method creates <style> node and appends reengineered css
	*/
	var injectStyleNode = function()
	{
		
		var enginneredCSS = reEngineerCSS(model),
			t0 = new Date().getTime();
		    head = document.head || document.getElementsByTagName('head')[0],
		    style = lookupStyleNode();

		if (style.styleSheet){
		  style.styleSheet.cssText = enginneredCSS;
		} else {
		  style.appendChild(document.createTextNode(enginneredCSS));
		}
			
		
		head.appendChild(style);
		var t1 = new Date().getTime();
		//// console.log('Inject: ', t1-t0, ' ms');

	}

	var injectCSSStyleSheet = function()
	{
		//document.styleSheets[2].addRule('*','border:1px solid red')
	}

	window.onresize = function(){injectStyleNode();}
	var t0 = new Date().getTime();
	injectStyleNode();
	var t1 = new Date().getTime();
	// console.log('Reengineering time: ', t1-t0, ' ms');

})(window);

/*

	function parseCSS(cssText)
	{
		var result = [],mediaSelecorStack = [];
		

		// this function takes string and attempts to parse out name: value;
		// this function should return only properties with further significance
		var parseRules = function(source)
		{
			var result = [];
			var t0 = new Date().getTime();
			source.replace(/([a-z-]+):([^;]+);/g, function(a,property,value)
			{
				value.replace(/([0-9-+.]+)(vw|vh|vmin|vmax)/, function(a,value,unit)
				{
					result.push({property:property, value:value, unit:unit});
				});
			});
			var t1 = new Date().getTime();
			//// console.log('Parse rules ', t1-t0,' ms');
			return result;
		}


		var walker = function(cssText)
		{
			var 
				
				buf = '', 
				currentSelector = '', 
				mode = 0, 
				braceLevel = 0;

			for (var index=0;index<cssText.length;index++)
			{
				var chr = cssText.charAt(index);
				switch (mode)
				{
					case 0: // parsējam selektorus
						switch(chr)
						{
							case '{':
								currentSelector = buf.trim();

								buf = '{';
								mode = 1;
								braceLevel = 1;
							break;			
							default:
								buf += chr;
						}
					break;

					case 1: // meklējam noslēdzošo iekavu
						buf += chr;
						if (chr == '{') braceLevel++;
						if (chr == '}') braceLevel--;
						if (braceLevel == 0)
						{
							buf = buf.trim();
							if (currentSelector.match(/@media/))
							{
								buf = buf.substr(1, buf.length-2);
								mediaSelecorStack.push(currentSelector);
								walker(buf);
								mediaSelecorStack.pop();
							}
							else
							{
								var rulesStr = buf.substr(1,buf.length-2).trim();
								var rulesArr = parseRules(rulesStr);
								
								if (rulesArr.length > 0)
								{
									result.push({
										media 		: mediaSelecorStack.slice(0),
										selector 	: currentSelector,
										rules  		: rulesArr

									});
								}
							}
							buf = '';
							mode = 0;
							currentSelector = '';
						}
						
					break;
				}
				
			}	
		}
		walker(cssText);
		return result;
	}

*/