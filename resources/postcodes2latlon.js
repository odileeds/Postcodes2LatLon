/*!
 * ODI Leeds Postcodes to Latitude/Longitude (version 1.0)
 *
 * TO DO:
 */
S(document).ready(function(){


	function receiveMessage(event) {
		console.log('Received message from '+event.origin);
		if(event.origin !== "https://odileeds.github.io" && event.origin !== "https://odileeds.org") return;

		S('#drop_zone').append('<div><strong>Received data from '+event.data.referer+'</strong> - ' + niceSize(event.data.csv.length) + '</div>').addClass('loaded');
		convertor.parsePostcodes(event.data.csv,{'data':CSVToArray(event.data.csv)});

		return;
	}

	window.addEventListener("message", receiveMessage, false);

	// Main function
	function Postcodes2LatLon(file){

		this.version = "1.0";

		this.logging = true;
		this.log = new Logger({'id':'Postcodes2LatLon','logging':this.logging,'logtime':true});
		this.messages = [];
		this.data = {};
		this.postcodes = {};

		// If we provided a filename we load that now
		if(file) S().ajax(file,{'complete':this.parsePostcodes,'this':this,'cache':false});

		this.buildMessages();
		return this;
	}

	
	// Parse the CSV file
	Postcodes2LatLon.prototype.parsePostcodes = function(data,attr){

		this.originaldata = data;
		this.attr = attr;
		var i,pc,ok;

		// Convert the CSV to a JSON structure
		this.data = Array2JSON(attr.data);
		this.records = this.data.rows.length; 
		for(i = 0; i < this.data.fields.name.length; i++){
			if(this.data.fields.name[i].toLowerCase().replace(/ /g,"")=="postcode" || this.data.fields.name[i].toLowerCase().replace(/ /g,"")=="pcd" || this.data.fields.name[i].toLowerCase().replace(/ /g,"")=="postcodes"){
				this.data.postcodecolumn = i;
			}
		}
		if(this.data.postcodecolumn < 0){
			this.log.error('No postcode column provided');
			return;
		}

		// Regex for postcodes 
		var validpostcode = new RegExp(/^([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})$/);

		this.data.postcodes = [];
		var postcodeareas = {};
		this.messages = [];

		for(i = 0; i < this.records; i++){
			if(this.data.rows[i][this.data.postcodecolumn]){
				// Remove leading/trailing spaces
				this.data.rows[i][this.data.postcodecolumn] = this.data.rows[i][this.data.postcodecolumn].replace(/(^ | $)/g,"");
				// Check if this seems to be a valid postcode
				match = this.data.rows[i][this.data.postcodecolumn].match(validpostcode);
				ok = false;
				pc = this.data.rows[i][this.data.postcodecolumn];
				if(match){
					for(var m = 0; m < match.length; m++){
						if(match[m] == pc){
							// Valid postcode
							ok = true;
						}
					}
				}
				if(ok){
					// Now we need to find the postcode areas e.g. LS, BD, M etc and load those files if we haven't
					pc.replace(/^[A-Z]{1,2}/,function(m){ postcodeareas[m] = true; });
					// Remove spaces
					this.data.postcodes.push(pc.replace(/ /g,""));
				}else{
					this.messages.push({'type':'warning','title':pc+' does not seem to be a valid postcode on record '+(i+2)});
				}
			}
		}

		// Now load postcode area files
		this.toload = 0;
		this.loaded = 0;
		for(var area in postcodeareas){
			if(postcodeareas[area] && !this.postcodes[area]){
				this.toload++;
			}
		}
		for(var area in postcodeareas){
			if(postcodeareas[area] && !this.postcodes[area]){
				S().ajax("postcodes/"+area+".csv",{
					"dataType": "text",
					"this": this,
					"area": area,
					"success": function(d,attr){
						var i,imd,pc,pccol;
						d = Array2JSON(CSVToArray(d));
						this.postcodes[attr.area] = {};
						for(i = 0; i < d.rows.length; i++){
							pc = d.rows[i][0].replace(/ /g,"")	// Remove spaces
							if(pc){
								this.postcodes[attr.area][pc] = {'postcode':d.rows[i][0],'latitude':d.rows[i][1],'longitude':d.rows[i][2]};
							}
						}
						// Ignore the header column
						this.loaded++;
						if(this.toload==this.loaded) this.buildOutput();
					},
					"error": function(e,attr){
						this.log.error('Unable to load '+attr.url);
						this.messages.push({'type':'error','title':'Unable to load '+attr.url});
						// Ignore the header column
						this.loaded++;
						if(this.toload==this.loaded) this.buildOutput();
					}
				});
			}
		}
		if(this.toload==0) this.buildOutput();

		if(this.changes > 0) this.messages.push({'type':'message','title':'Made '+this.changes+' change'+(this.changes == 1 ? "":"s")});
		this.buildMessages();
		
		return;
	};
	
	Postcodes2LatLon.prototype.buildOutput = function(){

		var i,c;
		var latcol = -1;
		var loncol = -1;
		for(i = 0; i < this.data.fields.name.length; i++){
			if(this.data.fields.name[i].toLowerCase()=="latitude" || this.data.fields.name[i].toLowerCase()=="lat") latcol = i;
			if(this.data.fields.name[i].toLowerCase()=="longitude") loncol = i;
		}
		
		this.csv = "";
		table = '<div class="table-holder"><table class="odi"><tr>';
		for(i = 0; i < this.data.fields.name.length; i++){
			if(i > 0) this.csv += ",";
			if(this.data.fields.name[i].indexOf(',') >= 0) this.csv += '"';
			this.csv += this.data.fields.name[i];
			if(this.data.fields.name[i].indexOf(',') >= 0) this.csv += '"';
			table += '<th>'+this.data.fields.name[i]+'</th>';
			if(i == this.data.postcodecolumn){
				if(latcol < 0){
					this.csv += ',Latitude';
					table += '<th>Latitude</th>';
				}
				if(loncol < 0){
					this.csv += ',Longitude';
					table += '<th>Longitude</th>';
				}
			}
		}

		this.csv += "\r\n";
		table += '</tr>';

		for(i = 0; i < this.data.rows.length; i++){
			area = "";
			pcfull = "";
			pc = "";
			if(i < 10) table += '<tr>';
			area = "";
			pcfull = this.data.rows[i][this.data.postcodecolumn]
			pc = this.data.rows[i][this.data.postcodecolumn].replace(/ /g,"");
			pc.replace(/^[A-Z]{1,2}/,function(m){ area = m; });

			if(pc){
				if(latcol >= 0 || loncol >= 0){
					if(!this.postcodes[area] || !this.postcodes[area][pc]) this.messages.push({'type':'warning','title':'Postcode '+pcfull+' on line '+(i+2)+' has no coordinates'});
				}
				for(c = 0; c < this.data.fields.name.length; c++){
					if(c > 0) this.csv += ',';
					cls = "";

					if(c == latcol){
						if(!this.data.rows[i][c] && this.postcodes[area] && this.postcodes[area][pc]){
							this.data.rows[i][c] = (this.postcodes[area][pc].latitude||"");
							cls = "c14-bg";
						}
					}
					if(c == loncol){
						if(!this.data.rows[i][c] && this.postcodes[area] && this.postcodes[area][pc]){
							this.data.rows[i][c] = (this.postcodes[area][pc].longitude||"");
							cls = "c14-bg";
						}
					}

					if(this.data.rows[i][c].indexOf(',') >= 0) this.csv += '"';
					this.csv += this.data.rows[i][c];
					if(this.data.rows[i][c].indexOf(',') >= 0) this.csv += '"';
					if(i < 10) table += '<td'+(cls ? ' class="'+cls+'"':'')+'>'+this.data.rows[i][c]+'</td>';
					if(c == this.data.postcodecolumn){
						if(latcol < 0){
							lat = "";
							if(this.postcodes[area] && this.postcodes[area][pc]) lat = this.postcodes[area][pc].latitude;
							this.csv += ','+lat;
							if(i < 10) table += '<td class="c14-bg">'+lat+'</td>';
						}
						if(loncol < 0){
							lon = "";
							if(this.postcodes[area] && this.postcodes[area][pc]) lon = this.postcodes[area][pc].longitude;
							this.csv += ','+lon;
							if(i < 10) table += '<td class="c14-bg">'+lon+'</td>';
						}
					}
				}
			}else{
				this.messages.push({'type':'warning','title':'No postcode on line '+(i+2)});
			}

			this.csv += '\r\n';
			if(i < 10) table += '</tr>';
		}
		table += '</table></div>';
		S('#contents').html(table);

		this.buildMessages();

		if(S('#geojson').length==0){
			S('#example').after(' <button id="geojson" class="c14-bg" type="button">Show on a map (and convert to GeoJSON)</button>');
			S('#geojson').on('click',{me:this},function(e){
				e.preventDefault();
				// Open in CSV2GeoJSON
				var geojson = window.open("https://odileeds.github.io/CSV2GeoJSON/", "GeoJSON", "");
				var csv = e.data.me.csv;
				setTimeout(function(){
					console.log('postMessage')
					geojson.postMessage({
						"referer": "Postcodes2LatLon",
						"csv": csv
					}, "https://odileeds.github.io");
				},1000);
			});
		}
		if(S('#imd').length==0 && location.search.indexOf('debug') >= 0){
			S('#geojson').after(' <button id="imd" class="c14-bg" type="button">IMD decile distribution</button>');
			S('#imd').on('click',{me:this},function(e){
				e.preventDefault();
				// Open in CSV2GeoJSON
				var imd = window.open("https://odileeds.github.io/Postcodes2IMD/", "IMD", "");
				var csv = e.data.me.csv;
				setTimeout(function(){
					console.log('postMessage')
					imd.postMessage({
						"referer": "Postcodes2LatLon",
						"csv": csv
					}, "https://odileeds.github.io");
				},1000);
			});
		}

		return this;
	}

	Postcodes2LatLon.prototype.buildMessages = function(){
		var html = "";
		var i;
		if(this.messages.length > 0){
			for(i = 0; i < this.messages.length; i++){
				sym = "";
				if(this.messages[i]['type']=="warning") sym = "⚠️";
				html += '<li>'+sym+this.messages[i].title+'</li>';
			}
			if(html) html = '<ol>'+html+'</ol>';
			S('#message-holder').css({'display':''});
		}else{
			S('#message-holder').css({'display':'none'});
		}
		S('#messages').html(html);
		return this;
	};
			
	Postcodes2LatLon.prototype.save = function(){

		// Bail out if there is no Blob function
		if(typeof Blob!=="function") return this;

		var textFileAsBlob = new Blob([this.csv], {type:'text/plain'});
		if(!this.file) this.file = "data.csv";
		var fileNameToSaveAs = this.file.substring(0,this.file.lastIndexOf("."))+"-with-coordinates.csv";
		function destroyClickedElement(event){ document.body.removeChild(event.target); }

		var dl = document.createElement("a");
		dl.download = fileNameToSaveAs;
		dl.innerHTML = "Download File";
		if(window.webkitURL != null){
			// Chrome allows the link to be clicked
			// without actually adding it to the DOM.
			dl.href = window.webkitURL.createObjectURL(textFileAsBlob);
		}else{
			// Firefox requires the link to be added to the DOM
			// before it can be clicked.
			dl.href = window.URL.createObjectURL(textFileAsBlob);
			dl.onclick = destroyClickedElement;
			dl.style.display = "none";
			document.body.appendChild(dl);
		}
		dl.click();
		S('.step3').addClass('checked');

		return this;
	};

	Postcodes2LatLon.prototype.handleFileSelect = function(evt,typ){

		evt.stopPropagation();
		evt.preventDefault();
		dragOff();

		var files;
		if(evt.dataTransfer && evt.dataTransfer.files) files = evt.dataTransfer.files; // FileList object.
		if(!files && evt.target && evt.target.files) files = evt.target.files;

		var _obj = this;
		if(typ == "csv"){

			// files is a FileList of File objects. List some properties.
			var output = "";
			for (var i = 0, f; i < files.length; i++) {
				f = files[i];

				this.file = f.name;
				// ('+ (f.type || 'n/a')+ ')
				output += '<div id="filedetails"><strong>'+ (f.name)+ '</strong> - ' + niceSize(f.size) + ', last modified: ' + (f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a') + '</div>';

				// DEPRECATED as not reliable // Only process csv files.
				//if(!f.type.match('text/csv')) continue;

				var start = 0;
				var stop = f.size - 1; //Math.min(100000, f.size - 1);

				var reader = new FileReader();

				// Closure to capture the file information.
				reader.onloadend = function(evt) {
					if (evt.target.readyState == FileReader.DONE) { // DONE == 2
						if(stop > f.size - 1){
							var l = evt.target.result.regexLastIndexOf(/[\n\r]/);
							result = (l > 0) ? evt.target.result.slice(0,l) : evt.target.result;
						}else result = evt.target.result;

						// Render table
						_obj.parsePostcodes(result,{'url':f.name,'data':CSVToArray(result)});
					}
				};
				
				// Read in the image file as a data URL.
				//reader.readAsText(f);
				var blob = f.slice(start,stop+1);
				reader.readAsText(blob);
			}
			//document.getElementById('list').innerHTML = '<p>File loaded:</p><ul>' + output.join('') + '</ul>';
			S('#drop_zone').append(output).addClass('loaded');

		}
		return this;
	};
	
	/**
	 * https://www.bennadel.com/blog/1504-ask-ben-parsing-csv-strings-with-javascript-exec-regular-expression-command.htm
	 * CSVToArray parses any String of Data including '\r' '\n' characters,
	 * and returns an array with the rows of data.
	 * @param {String} CSV_string - the CSV string you need to parse
	 * @param {String} delimiter - the delimeter used to separate fields of data
	 * @returns {Array} rows - rows of CSV where first row are column headers
	 */
	function CSVToArray (CSV_string, delimiter) {
	   delimiter = (delimiter || ","); // user-supplied delimeter or default comma

	   var pattern = new RegExp( // regular expression to parse the CSV values.
		 ( // Delimiters:
		   "(\\" + delimiter + "|\\r?\\n|\\r|^)" +
		   // Quoted fields.
		   "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
		   // Standard fields.
		   "([^\"\\" + delimiter + "\\r\\n]*))"
		 ), "gi"
	   );

	   var rows = [[]];  // array to hold our data. First row is column headers.
	   // array to hold our individual pattern matching groups:
	   var matches = false; // false if we don't find any matches
	   // Loop until we no longer find a regular expression match
	   while (matches = pattern.exec( CSV_string )) {
		   var matched_delimiter = matches[1]; // Get the matched delimiter
		   // Check if the delimiter has a length (and is not the start of string)
		   // and if it matches field delimiter. If not, it is a row delimiter.
		   if (matched_delimiter.length && matched_delimiter !== delimiter) {
			 // Since this is a new row of data, add an empty row to the array.
			 rows.push( [] );
		   }
		   var matched_value;
		   // Once we have eliminated the delimiter, check to see
		   // what kind of value was captured (quoted or unquoted):
		   if (matches[2]) { // found quoted value. unescape any double quotes.
			matched_value = matches[2].replace(
			  new RegExp( "\"\"", "g" ), "\""
			);
		   } else { // found a non-quoted value
			 matched_value = matches[3];
		   }
		   // Now that we have our value string, let's add
		   // it to the data array.
		   rows[rows.length - 1].push(matched_value);
	   }
	   if(rows[rows.length - 1].length == 1 && rows[rows.length - 1][0]=="") rows.pop();
	   return rows; // Return the parsed data Array
	}

	// Function to parse a 2D array and return a JSON structure
	// Guesses the format of each column based on the data in it.
	function Array2JSON(data){

		var line,datum,header,types;
		var newdata = new Array();
		var formats = new Array();
		var req = new Array();
		var start = 1;
		var r,c,isdate;
		header = data[0];

		for(r = 0, rows = 0 ; r < data.length; r++){

			datum = new Array(data[r].length);
			types = new Array(data[r].length);

			// Loop over each column in the line
			for(c = 0; c < data[r].length; c++){
				
				// Remove any quotes around the column value
				datum[c] = data[r][c].replace(/^\"(.*)\"$/,function(m,p1){ return p1; });

				isdate = false;
				if(datum[c].search(/[0-9]{2}[\/\- ][0-9]{2}[\/\- ][0-9]{4}/) >= 0) isdate = true;
				if(!isNaN(Date.parse(datum[c]))) isdate = true;
				// If the value parses as a float
				if(typeof parseFloat(datum[c])==="number" && parseFloat(datum[c]) == datum[c]){
					types[c] = "float";
					// Check if it is actually an integer
					if(typeof parseInt(datum[c])==="number" && parseInt(datum[c])+"" == datum[c]){
						types[c] = "integer";
						// If it is an integer and in the range 1700-2100 we'll guess it is a year
						if(datum[c] >= 1700 && datum[c] < 2100) types[c] = "year";
					}
				}else if(datum[c].search(/^(true|false)$/i) >= 0){
					// The format is boolean
					types[c] = "boolean";
				}else if(datum[c].search(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/) >= 0){
					// The value looks like a URL
					types[c] = "URL";
				}else if(isdate){
					// The value parses as a date
					types[c] = "datetime";
				}else{
					// Default to a string
					types[c] = "string";
					// If the string value looks like a time we set it as that
					if(datum[c].search(/^[0-2]?[0-9]\:[0-5][0-9]$/) >= 0) types[c] = "time";
				}
			}
			if(r == 0 && start > 0) header = datum;
			if(r >= start){
				newdata[rows] = datum;
				formats[rows] = types;
				rows++;
			}
		}
		
		// Now, for each column, we sum the different formats we've found
		var format = new Array(header.length);
		for(var j = 0; j < header.length; j++){
			var count = {};
			var empty = 0;
			for(var i = 0; i < newdata.length; i++){
				if(!newdata[i][j]) empty++;
			}
			for(var i = 0 ; i < formats.length; i++){
				if(!count[formats[i][j]]) count[formats[i][j]] = 0;
				count[formats[i][j]]++;
			}
			var mx = 0;
			var best = "";
			for(var k in count){
				if(count[k] > mx){
					mx = count[k];
					best = k;
				}
			}
			// Default
			format[j] = "string";

			// If more than 80% (arbitrary) of the values are a specific format we assume that
			if(mx >= 0.8*newdata.length) format[j] = best;

			// If we have a few floats in with our integers, we change the format to float
			if(format[j] == "integer" && count['float'] > 0.1*newdata.length) format[j] = "float";

			req.push(header[j] ? true : false);
		}

		// Return the structured data
		return { 'fields': {'name':header,'title':clone(header),'format':format,'required':req }, 'rows': newdata };
	}
	// Function to clone a hash otherwise we end up using the same one
	function clone(hash) {
		var json = JSON.stringify(hash);
		var object = JSON.parse(json);
		return object;
	}

	function dropOver(evt){
		evt.stopPropagation();
		evt.preventDefault();
		S(this).addClass('drop');
	}
	function dragOff(){ S('.drop').removeClass('drop'); }

	String.prototype.regexLastIndexOf = function(regex, startpos) {
		regex = (regex.global) ? regex : new RegExp(regex.source, "g" + (regex.ignoreCase ? "i" : "") + (regex.multiLine ? "m" : ""));
		if(typeof (startpos) == "undefined") {
			startpos = this.length;
		} else if(startpos < 0) {
			startpos = 0;
		}
		var stringToWorkWith = this.substring(0, startpos + 1);
		var lastIndexOf = -1;
		var nextStop = 0;
		while((result = regex.exec(stringToWorkWith)) != null) {
			lastIndexOf = result.index;
			regex.lastIndex = ++nextStop;
		}
		return lastIndexOf;
	}

	function niceSize(b){
		if(b > 1e12) return (b/1e12).toFixed(2)+" TB";
		if(b > 1e9) return (b/1e9).toFixed(2)+" GB";
		if(b > 1e6) return (b/1e6).toFixed(2)+" MB";
		if(b > 1e3) return (b/1e3).toFixed(2)+" kB";
		return (b)+" bytes";
	}

	function Logger(inp){
		if(!inp) inp = {};
		this.logging = (inp.logging||false);
		this.logtime = (inp.logtime||false);
		this.id = (inp.id||"JS");
		this.metrics = {};
		return this;
	}
	Logger.prototype.error = function(){ this.log('ERROR',arguments); };
	Logger.prototype.warning = function(){ this.log('WARNING',arguments); };
	Logger.prototype.info = function(){ this.log('INFO',arguments); };
	Logger.prototype.message = function(){ this.log('MESSAGE',arguments); }
	Logger.prototype.log = function(){
		if(this.logging || arguments[0]=="ERROR" || arguments[0]=="WARNING" || arguments[0]=="INFO"){
			var args,args2,bold;
			args = Array.prototype.slice.call(arguments[1], 0);
			bold = 'font-weight:bold;';
			if(console && typeof console.log==="function"){
				if(arguments[0] == "ERROR") console.error('%c'+this.id+'%c: '+args[0],bold,'',args);
				else if(arguments[0] == "WARNING") console.warn('%c'+this.id+'%c: '+args[0],bold,'',args);
				else if(arguments[0] == "INFO") console.info('%c'+this.id+'%c: '+args[0],bold,'',args);
				else console.log('%c'+this.id+'%c: '+args[0],bold,'',args);
			}
		}
		return this;
	}
	Logger.prototype.time = function(key){
		if(!this.metrics[key]) this.metrics[key] = {'times':[],'start':''};
		if(!this.metrics[key].start) this.metrics[key].start = new Date();
		else{
			var t,w,v,tot,l,i,ts;
			t = ((new Date())-this.metrics[key].start);
			ts = this.metrics[key].times;
			// Define the weights for each time in the array
			w = [1,0.75,0.55,0.4,0.28,0.18,0.1,0.05,0.002];
			// Add this time to the start of the array
			ts.unshift(t);
			// Remove old times from the end
			if(ts.length > w.length-1) ts = ts.slice(0,w.length);
			// Work out the weighted average
			l = ts.length;
			this.metrics[key].av = 0;
			if(l > 0){
				for(i = 0, v = 0, tot = 0 ; i < l ; i++){
					v += ts[i]*w[i];
					tot += w[i];
				}
				this.metrics[key].av = v/tot;
			}
			this.metrics[key].times = ts.splice(0);
			if(this.logtime) this.info(key+' '+t+'ms ('+this.metrics[key].av.toFixed(1)+'ms av)');
			delete this.metrics[key].start;
		}
		return this;
	};

	// Define a new instance of the Converter
	convertor = new Postcodes2LatLon();

	// Add UI functionality
	S('#save').on('click',{me:convertor},function(e){
		e.preventDefault();
		e.stopPropagation();
		e.data.me.save();
	});

	// Setup the dnd listeners.
	var dropZone = document.getElementById('drop_zone');
	dropZone.addEventListener('dragover', dropOver, false);
	dropZone.addEventListener('dragout', dragOff, false);

	document.getElementById('standard_files').addEventListener('change', function(evt){
		return convertor.handleFileSelect(evt,'csv');
	}, false);

	S('#reset').on('click',{me:convertor},function(e){
		e.preventDefault();
		
		S('#step1').css({'display':''});
		S('#drop_zone').removeClass('loaded');
		S('#filedetails').remove();
		S('#contents').html('');
		delete convertor.csv;
		delete convertor.attr;
		delete convertor.data;
		delete convertor.records;
		delete convertor.file;
		convertor.messages = [];
		convertor.changes = 0;
		convertor.buildMessages();
		
	});

	S('#reset').after(' <button id="example" class="c14-bg" type="button">Load example</button>');
	S('#example').on('click',{me:this},function(e){
		e.preventDefault();
		
		file = "example.csv";
		S().ajax(file,{
			"this":convertor,
			"cache":true,
			"success":function(d,attr){
				this.parsePostcodes(d,{'url':attr.url,'data':CSVToArray(d)});
			},
			"error": function(e,attr){
				this.log.error('Unable to load '+attr.url,e,attr);
			}
		});
	});

});

var convertor;