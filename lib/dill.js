
window._dill = {
	modules: {}
};


// Finds any values inside a string of text (e.g "example {{value}}"). And uses the current data to fill it out.
// E.g data -> {value:"One"} & text -> "example {{value}}" = "example One".
window._dill.bracer = function(text_node_value,scope_data){
	var sections = text_node_value.split("{{"),
		str = sections.shift();
	sections.forEach(function(x){
		var brace_index = x.indexOf("}}");
		str += this.evaluator(x.substring(0,brace_index),scope_data) + x.substring(brace_index+2,x.length);
	}.bind(this));
	return str;
}


var ref = window._dill;

ref.lock = function(obj){
	Object.seal(obj);
	Object.freeze(obj);
	return obj;
}	

ref.Render = function(target,template,parent_template){
	var _condition = undefined;
	Object.defineProperty(this,"condition",{
		get: function(){
			return _condition;
		},
		set: function(value){
			_condition = value;
		},
		writeable: true
	});
	this.target = target;
	this.template = template;
	if (parent_template) {
		this.parent_template = parent_template;
	}
	ref.lock(this);
}

ref.for_each = function(list,callback){
	for (var i=list.length-1;i>=0;i--) {
		callback(list[i],i);
	}
}

ref.substring = function(context,a,b){
	return String.prototype.substring.apply(context,[a,b]);
}

ref.evaluator = function(text,scope_data){
	var value,
		output = "",
		inverse = false;
	if (text.charAt(0) === "!") {
		text = text.substring(1,text.length);
		inverse = true;
	}
	value = scope_data[text];
	if (value === undefined) {
		return output;
	}
	if (typeof value === "function") {
		output = value.apply(scope_data);
	}
	else {
		output = value;
	}
	return inverse
		? !output
		: output;
}


window._dill.create_data_object = function(input){
	var template_object = typeof input.template_object === "function"
			? new input.template_object()
			: input.template_object,
		parent_data = input.parent_data,
		index = input.index,
		scope = input.scope,
		Data = function(template_object){
			for (var key in (template_object?template_object:{})) {
				(function(){
					var _value;
					if (key !== "oninit" && key !== "ondestory") {
						Object.defineProperty(this,key,{
							get: function(){
								return _value;
							},
							set: function(value){
								_value = value;
							}
						});
					}
					this[key] = template_object[key];
				}.apply(this));
			}

// If this function has this argument then it has come from a dill-for.
			if (index !== undefined) {
				this._item = template_object;
				this._index = index;
			}

// If scope is not isolated then add a reference to the parent data.
			if (!scope && parent_data) {
				this._parent = parent_data;
			}
		};

// If scope is not isolated then set the prototype. Inheriting from data parent is the default and handled automatically in JS.
	if (!scope) {
		Data.prototype = parent_data;
	}
	var output = new Data(template_object);
	return output;
}


var extend = function(ele,scope,value){
	if (value === undefined) {
		throw("No value for property 'dill-extends' on dill-extends=\"" + ele.attributes["dill-extends"].nodeValue + "\"");
	}
	Object.keys(value).forEach(function(key){
		var prop = key,
			length = prop.length,
			middle = prop.substring(1,length-1),
			has_this_wrapper = function(start,end){
				return prop.substr(0,start.length) === start && prop.substr(length-end.length,length) === end;
			};
		if (has_this_wrapper("[(",")]")) {
			prop = ":" + prop.substring(2,length-2) + ":";
		}
		else if (has_this_wrapper("[","]")) {
			prop = ":" + middle;
		}
		else if (has_this_wrapper("(",")")) {
			prop = middle + ":";
		}
		ele.setAttribute(prop,value[key]);
	}.bind(this));
}

window._dill.dill_extends = function(target,data){
	if (target.hasAttribute("dill-extends")) {
		extend.apply(this,[target,data,data[target.attributes["dill-extends"].nodeValue]]);
		target.removeAttribute("dill-extends");
	}
}


window._dill.template_for = function(target,template){
	if (!target.hasAttribute("dill-for")) {
		return;
	}
	var value = target.attributes["dill-for"].nodeValue;
	if (!template.data[value]) {

	}
	target.removeAttribute("dill-for");
	template.for = {
		clone: target.cloneNode(true),
		value: value,
		current: 1
	};
}

window._dill.render_for = function(render,condition){
	if (!render instanceof this.Render) {
		return;
	}
	var target = render.target,
		first_element = target,
		template = render.template,
		parent = target.parentNode,
		i,
		current = template.for.current,
		items = this.evaluator(template.for.value,template.data);

	if (condition) {
		if (current !== 0) {
			for (i=0;i<current-1;i++) {
				parent.removeChild(target.nextElementSibling);
			}
			target = target.previousSibling;
			parent.removeChild(first_element);
		}
		else {
			target = target.previousSibling;
		}

		template.for.current = items.length;

		for (i=0;i<items.length;i++) {
			if (i === 0 && target === null) {
				if (parent.childNodes.length === 0) {
					parent.appendChild(template.for.clone.cloneNode(true));
					target = parent.children[0];
				}
				else {
					parent.insertBefore(template.for.clone.cloneNode(true), parent.childNodes[0]);
					target = parent.children[1];
				}
				target.removeAttribute("dill-for");
			}
			else {
				if (target.nextSibling === null) {
					parent.appendChild(template.for.clone.cloneNode(true));
				}
				else {
					parent.insertBefore(template.for.clone.cloneNode(true), target.nextSibling);
				}
			}
			target = target.nextElementSibling;
			if (i === 0) {
				first_element = target;
			}
			target.removeAttribute("dill-for");
		}
	}

	(function(){
		var _target = first_element,
			_data;
		for (var i=0;i<items.length;i++) {
			_data = this.create_data_object({
				template_object:items[i],
				parent_data:template.data,
				index:i
			});



			console.log("For: ",

				condition,

				render.condition === undefined || (render.condition instanceof Element
					? render.condition === _target
					: render.condition instanceof ref.Component
						? render.condition === template.component
						: false),
				_target

			);





			this.render_element(
				function(){
					var new_render = new ref.Render(_target,this.create_template(_target,_data,template.module));
					new_render.condition = render.condition;
					return new_render;
				}.apply(this),




				render.condition === undefined || (render.condition instanceof Element
					? render.condition === _target
					: render.condition instanceof ref.Component
						? render.condition === template.component
						: false)





			);
			_target = _target.nextElementSibling;
		}
	}.apply(this));
	return items.length;
}


window._dill.template_if = function(target,template,options){
	if (!target.hasAttribute("dill-if")) {
		return;
	}
	var value = target.attributes["dill-if"].nodeValue;
	template.if = {
		element: target,
		value: value,
		initial: (options && options.for)
			? typeof template.data[value] === "function" ? template.data[value]() : template.data[value]
			: true,
		parent: target.parentNode,
		first: true
	}
	target.removeAttribute("dill-if");
}

window._dill.render_if = function(target,template){
	var data = template.data,
		has_component = !!template.component,
		_if = template.if,
		parent = target.parentNode,
		if_value = this.evaluator(_if.value,data);
	if (!_if.initial && if_value) {
		target === undefined
			? _if.parent.appendChild(_if.element)
			: parent.insertBefore(_if.element,target);
		target = _if.element;
		_if.initial = if_value;
		has_component
			&& data.hasOwnProperty("oninit")
			&& data.oninit();
	}
	else if (_if.initial && !if_value) {
		_if.first && (delete _if.first);
		parent.removeChild(target);
		_if.initial = if_value;
		!_if.first
			&& has_component
			&& data.hasOwnProperty("ondestroy")
			&& data.ondestroy();
		return 0;
	}
	else if (!_if.initial && !if_value) {
		return 0;
	}
	return target;
}


window._dill.dill_template = function(target,template){
	var _template,
		value;
	if (target.hasAttribute("dill-template")) {
		value = template.data[target.attributes["dill-template"].nodeValue];
		template.template = value;
		target.removeAttribute("dill-template");
	}
}


var Component = function(name,data,template_literal,isolate){
	this.name = name;
	this.data = data;
	this.template = template_literal;
	this.isolate = isolate || false;
}

var ref = window._dill;

ref.Component = Component;

ref.generate_component = function(name,data,template_literal,isolate){
	return new Component(name,data,template_literal,isolate);
};


window._dill.template_component = function(target,template){

// Check that to see if this element is actually a component on this module, if not then return undefined and do not process element as a component.
	var current_component = template.module.components[target.nodeName.toLowerCase()];
	if (!current_component) {
		return;
	}
	template.component = current_component;
	if (typeof current_component.data === "function") {
		current_component.data = new current_component.data();
	}
	template.data = this.create_data_object({
		template_object: current_component.data,
		parent_data: template.data,
		scope: !!target.hasAttribute("dill-isolate")
	});
	template.data._template = target.innerHTML;
	target.innerHTML = current_component.template;
	template.data._module = template.module;
	template.module = current_component.module;
}


var Service = function(name,input,isolate){
	this.name = name;
	this.data = typeof input === "function"
		? new input()
		: typeof input === "object" && !Array.isArray(input)
			? input
			: null;
	this.isolate = isolate || false;
}

var ref = window._dill;

ref.Service = Service;

ref.generate_service = function(name,input,isolate){
	return new Service(name,input,isolate);
};


var ref = window._dill;

var Module = function(name,modules){
	this.name = name;
	this.components = {};
	this.services = {};
	modules && modules.forEach(function(x){
		if (typeof x === "string") {
			x = dill.get_module(x);
		}
		else if (!(x instanceof Module)) {
			return;
		}
		Object.keys(x.components).forEach(function(component){
			if (x.components[component].isolate) {
				return;
			}
			this.components[component] = x.components[component];
		}.bind(this));
		Object.keys(x.services).forEach(function(service){
			if (x.services[service].isolate) {
				return;
			}
			this.services[service] = x.services[service];
		}.bind(this));
	}.bind(this));
}

Module.prototype = {
	set_component: function(component){
		this.components[component.name] = component;
		component.module = this;
	},
	set_service: function(service){
		this.services[service.name] = service.data;
	}
}

ref.Module = Module;

ref.create_module = function(name,modules){
	return ref.lock(new Module(name,modules));
}


window._dill.create_attributes = function(target,template,parent_data){
	var output = [];
	this.for_each(target.attributes,function(attr){
		var name = attr.nodeName,
			value = attr.nodeValue,
			event_name,
			name_length = name.length,
			value_length = value.length,
			first = name.charAt(0),
			last = name.charAt(name_length-1),
			literal = value.charAt(0) === "'" && value.charAt(value_length-1,1) === "'",
			remove_attribute = function(){
				target.removeAttribute(name);
			},
			define = function(name,getter, setter){
				var construct = {};
				if (getter){
					construct.get = function(){
						return parent_data[value];
					}
				}
				if (setter) {
					construct.set = function(_value){
						this[value] = _value;
					}
				}
				Object.defineProperty(template.data,name,construct);
			};
		if (first === "#") {
			Object.defineProperty(template.data,name.substring(1,name.length),{
				get: function(){
					return target;
				}
			});
			return remove_attribute();
		}
	// If attribute is bindable (surrounded by square brackets or started with :) then save this to the template.
	// Square bracket notation is not valid syntax when setting attributes so use : instead.
	// Square brackets make developing easier as the logic is easier to see.
		if ( (first === "[" && last === "]") || first === ":" ) {
			if (template.component) {
				define(this.substring(name,1,name_length-1),true,false);
			}
			else {
				output.push({
					name: this.substring(name,1,name_length-(first !== ":")),
					value: literal
						? this.substring(value,1,value_length-1)
						: value,
					type: literal
						? "literal"
						: "bind"
				});
			}
			return remove_attribute();
		}

	// If the attribute is surrounded by parenthesis ( (a) ), or ends with : then assign a name as an event listener.
		if ( (first === "(" && last === ")") || last === ":" ) {
			if (template.component) {
				define(this.substring(name,1,name_length-1),false,true);
			}
			else {
				event_name = this.substring(
					name,
					last === ":"
						? 0
						: 1,
					name_length-1
				);
				target.addEventListener(event_name,function(event){
					var returns;
					if (template.data[value] === undefined) {
						dill.change();
						return;
					}
					returns = template.data[value].apply(template.data,[event,target]);
					if (returns === false) {
						return;
					}
					dill.change();
				});
			}
			return remove_attribute();
		}
		if (name.substr(0,5) === "dill-") {
			return;
		}
		if (template.component) {
			template.data[name] = parent_data[value];
		}
		else {
			output.push({
				name: name,
				value: literal
					? this.substring(value,1,value_length-1)
					: value,
				type: literal
					? "literal"
					: "default"
			});
		}
	}.bind(this));
	return output;
}


var Template = function(name,data,module){
	this.type = name;
	this.data = data;
	this.module = module;
	this.data._module = module;
}

var ref = window._dill;

// This function produces a template object which represents an element inside the target section on DOM for Dill.
// The template object is extended which more branches for each child of the element.
ref.create_template = function(target,data,module,options){
	var template = new Template(target.nodeName,data,module),
		has_for,
		_data = template.data;

// If the element is a text node or comment then that is the end of the template branch.
	if (target.nodeName === "#text" || target.nodeName === "#comment") {
		template.value = target.nodeValue;
		return template;
	}

// If the function exists handle the dill-extends attribute.
	this.dill_extends && this.dill_extends(target,data);

// This set for later. It needs to be set here because inside the template_for function it is removed from the element.
// This attribute is removed so that the render function and template function do not get stuck in a loop.
	has_for = target.hasAttribute("dill-for");

// If the function exists handle the dill-for attribute.
	this.template_for && this.template_for(target,template,options);

// Run through each attribute
	template.attributes = this.create_attributes(target,template,_data);
	
// If the attribute dill-for exists then don't continue, this will be picked on whenever a new element inside this repeat is added and a template with the correct context is generated.
	if (has_for) {
		return template;
	}

// If the function exists handle the dill-if attribute.
	this.template_if && this.template_if(target,template,options);

// If the function exists handle the dill-template attribute.
	this.dill_template && this.dill_template(target,template);

// If this element is actually a component it will be found and handled as such from here.
// If the function exists handle the component function.
	this.template_component && this.template_component(target,template);

	(function(){
		var value = template.if && template.data[template.if.value];
		if (!template.component || !template.data.hasOwnProperty("oninit")) {
			return;
		}
		if (template.if && !(
				typeof value === "function"
					? value()
					: value
				)) {
			return;
		}
		setTimeout(function(){
			template.data.oninit();
		},0);
	}());

// For each child element create a new template branch.
	template.childs = Array.prototype.map.apply(target.childNodes,[(function(x){
		return this.create_template(x,template.data,template.module,options);
	}).bind(this)]);

	return template;
}


window._dill.render_attributes = function(target,template){
	template.attributes && template.attributes.forEach(function(x){
		var value = this.evaluator(x.value,template.data);
		if (!template.component && x.name !== "value") {
			target.setAttribute(
				x.name,
				x.type === "literal"
					? x.value
					: x.type === "bind"
						? value
						: x.type === "default"
							? this.bracer(x.value,template.data)
							: null
			);
		}
		else {
			target.value = value;
		}
	}.bind(this));
}


window._dill.render_element = function(render, condition){

	if (!render instanceof this.Render) {
		return;
	}

	var target = render.target,
		template = render.template,
		parent_template = render.parent_template,
		if_value;

	// console.log("Render: ", render.condition, render, condition);

	condition = render.condition === undefined || (render.condition instanceof Element
		? render.condition === target
		: render.condition instanceof ref.Component
			? render.condition === x.component
			: false);

	if (condition) {
		console.log("Target: ", target, render);
	}

	if (template.type === "#comment" || template.type === "SCRIPT") {
		return 1;
	}

	if (template.type === "#text") {
		if (condition) {
			target.nodeValue = this.bracer(template.value,template.data);
		}
		return 1;
	}

	if (template.hasOwnProperty("for")) {
		return this.render_for(render,condition);
	}

	if (condition) {
		if (template.hasOwnProperty("if")) {
			if_value = this.render_if(target,template);
			if (if_value === 0) {
				return 0;
			}
			target = if_value;
		}
		if (template.template) {
			(function(){
				var _template = template.template,
					attributes = template.attributes;
				target.innerHTML = typeof _template === "function"
					? _template.apply(template.data)
					: _template;
				template = this.create_template(target,template.data,template.module);
			// Recreating the template will generate the wrong attributes Array. We save it from its original and place it back in here:
				template.attributes = attributes;
				this.render_element(new ref.Render(target,template));
				template.template = _template;
			}.apply(this));
		}
		this.render_attributes(target,template);
	}

	(function(){
		var index = 0;

		template.childs && template.childs.forEach((function(x,i){

			// console.log("Parent target: ", target, target.childNodes[index]);

			if (target.childNodes[index] === undefined) {
				return;
			}
			
			
			// console.log("Condition: ", target.childNodes[index], render.condition, condition);

			index += this.render_element(
				function(){
					var new_render = new this.Render(target.childNodes[index],x,template);
					new_render.condition = render.condition;
					return new_render;
				}.apply(this),
				condition
			);
		}).bind(this));

	}.apply(this));

	return 1;
}


// List of renders (Templates and element targets).
var renders = [],
// Grab a reference to the private dill methods before they are deleted from the window object and garbage collected.
	ref = window._dill,
	Dill = function(){
		var modules = {};
		this.module = function(name,extensions){
			if (typeof name !== "string") {
				throw("You must pass a name when creating a module.");
			}
			if (modules[name]) {
				return modules[name];
			}
			modules[name] = ref.create_module(
				name,
				extensions === undefined
					? []
					: extensions
			);
			return modules[name];
		}
		this.get_module = function(name){
			return modules[name];
		}
		this.render = function(target,initial_data,module){
			var template,
				render;
			if (typeof initial_data !== "function") {
				throw("Data passed into the render function must be a constructor function.");
			}
			initial_data = new initial_data();
			initial_data = ref.create_data_object({template_object:initial_data});
			setTimeout(function(){
				initial_data.oninit && initial_data.oninit();
			},0);
			template = ref.create_template(target,initial_data,module);
			render = new ref.Render(target,template);
			renders.push(render);
			ref.render_element(render,true);
			return template.data;
		}
		this.change = function(condition){
			console.log("Change: ", condition);
			renders.forEach(function(x){
				x.condition = condition;
				ref.render_element(x,!condition);
			}.bind(this));
		}
		this.reset = function(){
			renders = [];
		}
		this.component = window._dill.generate_component;
		this.service = window._dill.generate_service;
	};
window.dill = new Dill();
delete window._dill;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluaXQuanMiLCJicmFjZXIuanMiLCJjb21tb24uanMiLCJjcmVhdGVfZGF0YV9vYmplY3QuanMiLCJleHRlbmRzLmpzIiwiZm9yLmpzIiwiaWYuanMiLCJ0ZW1wbGF0ZS5qcyIsImNvbXBvbmVudC5qcyIsInRlbXBsYXRlLWNvbXBvbmVudC5qcyIsInNlcnZpY2UuanMiLCJtb2R1bGUuanMiLCJ0ZW1wbGF0ZS1hdHRyaWJ1dGVzLmpzIiwidGVtcGxhdGUtY3JlYXRlLmpzIiwicmVuZGVyLWF0dHJpYnV0ZXMuanMiLCJyZW5kZXItZWxlbWVudC5qcyIsIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImRpbGwuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcclxud2luZG93Ll9kaWxsID0ge1xyXG5cdG1vZHVsZXM6IHt9XHJcbn07XHJcbiIsIlxyXG4vLyBGaW5kcyBhbnkgdmFsdWVzIGluc2lkZSBhIHN0cmluZyBvZiB0ZXh0IChlLmcgXCJleGFtcGxlIHt7dmFsdWV9fVwiKS4gQW5kIHVzZXMgdGhlIGN1cnJlbnQgZGF0YSB0byBmaWxsIGl0IG91dC5cclxuLy8gRS5nIGRhdGEgLT4ge3ZhbHVlOlwiT25lXCJ9ICYgdGV4dCAtPiBcImV4YW1wbGUge3t2YWx1ZX19XCIgPSBcImV4YW1wbGUgT25lXCIuXHJcbndpbmRvdy5fZGlsbC5icmFjZXIgPSBmdW5jdGlvbih0ZXh0X25vZGVfdmFsdWUsc2NvcGVfZGF0YSl7XHJcblx0dmFyIHNlY3Rpb25zID0gdGV4dF9ub2RlX3ZhbHVlLnNwbGl0KFwie3tcIiksXHJcblx0XHRzdHIgPSBzZWN0aW9ucy5zaGlmdCgpO1xyXG5cdHNlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oeCl7XHJcblx0XHR2YXIgYnJhY2VfaW5kZXggPSB4LmluZGV4T2YoXCJ9fVwiKTtcclxuXHRcdHN0ciArPSB0aGlzLmV2YWx1YXRvcih4LnN1YnN0cmluZygwLGJyYWNlX2luZGV4KSxzY29wZV9kYXRhKSArIHguc3Vic3RyaW5nKGJyYWNlX2luZGV4KzIseC5sZW5ndGgpO1xyXG5cdH0uYmluZCh0aGlzKSk7XHJcblx0cmV0dXJuIHN0cjtcclxufVxyXG4iLCJcclxudmFyIHJlZiA9IHdpbmRvdy5fZGlsbDtcclxuXHJcbnJlZi5sb2NrID0gZnVuY3Rpb24ob2JqKXtcclxuXHRPYmplY3Quc2VhbChvYmopO1xyXG5cdE9iamVjdC5mcmVlemUob2JqKTtcclxuXHRyZXR1cm4gb2JqO1xyXG59XHRcclxuXHJcbnJlZi5SZW5kZXIgPSBmdW5jdGlvbih0YXJnZXQsdGVtcGxhdGUscGFyZW50X3RlbXBsYXRlKXtcclxuXHR2YXIgX2NvbmRpdGlvbiA9IHVuZGVmaW5lZDtcclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcyxcImNvbmRpdGlvblwiLHtcclxuXHRcdGdldDogZnVuY3Rpb24oKXtcclxuXHRcdFx0cmV0dXJuIF9jb25kaXRpb247XHJcblx0XHR9LFxyXG5cdFx0c2V0OiBmdW5jdGlvbih2YWx1ZSl7XHJcblx0XHRcdF9jb25kaXRpb24gPSB2YWx1ZTtcclxuXHRcdH0sXHJcblx0XHR3cml0ZWFibGU6IHRydWVcclxuXHR9KTtcclxuXHR0aGlzLnRhcmdldCA9IHRhcmdldDtcclxuXHR0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGU7XHJcblx0aWYgKHBhcmVudF90ZW1wbGF0ZSkge1xyXG5cdFx0dGhpcy5wYXJlbnRfdGVtcGxhdGUgPSBwYXJlbnRfdGVtcGxhdGU7XHJcblx0fVxyXG5cdHJlZi5sb2NrKHRoaXMpO1xyXG59XHJcblxyXG5yZWYuZm9yX2VhY2ggPSBmdW5jdGlvbihsaXN0LGNhbGxiYWNrKXtcclxuXHRmb3IgKHZhciBpPWxpc3QubGVuZ3RoLTE7aT49MDtpLS0pIHtcclxuXHRcdGNhbGxiYWNrKGxpc3RbaV0saSk7XHJcblx0fVxyXG59XHJcblxyXG5yZWYuc3Vic3RyaW5nID0gZnVuY3Rpb24oY29udGV4dCxhLGIpe1xyXG5cdHJldHVybiBTdHJpbmcucHJvdG90eXBlLnN1YnN0cmluZy5hcHBseShjb250ZXh0LFthLGJdKTtcclxufVxyXG5cclxucmVmLmV2YWx1YXRvciA9IGZ1bmN0aW9uKHRleHQsc2NvcGVfZGF0YSl7XHJcblx0dmFyIHZhbHVlLFxyXG5cdFx0b3V0cHV0ID0gXCJcIixcclxuXHRcdGludmVyc2UgPSBmYWxzZTtcclxuXHRpZiAodGV4dC5jaGFyQXQoMCkgPT09IFwiIVwiKSB7XHJcblx0XHR0ZXh0ID0gdGV4dC5zdWJzdHJpbmcoMSx0ZXh0Lmxlbmd0aCk7XHJcblx0XHRpbnZlcnNlID0gdHJ1ZTtcclxuXHR9XHJcblx0dmFsdWUgPSBzY29wZV9kYXRhW3RleHRdO1xyXG5cdGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRyZXR1cm4gb3V0cHV0O1xyXG5cdH1cclxuXHRpZiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdG91dHB1dCA9IHZhbHVlLmFwcGx5KHNjb3BlX2RhdGEpO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdG91dHB1dCA9IHZhbHVlO1xyXG5cdH1cclxuXHRyZXR1cm4gaW52ZXJzZVxyXG5cdFx0PyAhb3V0cHV0XHJcblx0XHQ6IG91dHB1dDtcclxufVxyXG4iLCJcclxud2luZG93Ll9kaWxsLmNyZWF0ZV9kYXRhX29iamVjdCA9IGZ1bmN0aW9uKGlucHV0KXtcclxuXHR2YXIgdGVtcGxhdGVfb2JqZWN0ID0gdHlwZW9mIGlucHV0LnRlbXBsYXRlX29iamVjdCA9PT0gXCJmdW5jdGlvblwiXHJcblx0XHRcdD8gbmV3IGlucHV0LnRlbXBsYXRlX29iamVjdCgpXHJcblx0XHRcdDogaW5wdXQudGVtcGxhdGVfb2JqZWN0LFxyXG5cdFx0cGFyZW50X2RhdGEgPSBpbnB1dC5wYXJlbnRfZGF0YSxcclxuXHRcdGluZGV4ID0gaW5wdXQuaW5kZXgsXHJcblx0XHRzY29wZSA9IGlucHV0LnNjb3BlLFxyXG5cdFx0RGF0YSA9IGZ1bmN0aW9uKHRlbXBsYXRlX29iamVjdCl7XHJcblx0XHRcdGZvciAodmFyIGtleSBpbiAodGVtcGxhdGVfb2JqZWN0P3RlbXBsYXRlX29iamVjdDp7fSkpIHtcclxuXHRcdFx0XHQoZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRcdHZhciBfdmFsdWU7XHJcblx0XHRcdFx0XHRpZiAoa2V5ICE9PSBcIm9uaW5pdFwiICYmIGtleSAhPT0gXCJvbmRlc3RvcnlcIikge1xyXG5cdFx0XHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcyxrZXkse1xyXG5cdFx0XHRcdFx0XHRcdGdldDogZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBfdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKXtcclxuXHRcdFx0XHRcdFx0XHRcdF92YWx1ZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR0aGlzW2tleV0gPSB0ZW1wbGF0ZV9vYmplY3Rba2V5XTtcclxuXHRcdFx0XHR9LmFwcGx5KHRoaXMpKTtcclxuXHRcdFx0fVxyXG5cclxuLy8gSWYgdGhpcyBmdW5jdGlvbiBoYXMgdGhpcyBhcmd1bWVudCB0aGVuIGl0IGhhcyBjb21lIGZyb20gYSBkaWxsLWZvci5cclxuXHRcdFx0aWYgKGluZGV4ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHR0aGlzLl9pdGVtID0gdGVtcGxhdGVfb2JqZWN0O1xyXG5cdFx0XHRcdHRoaXMuX2luZGV4ID0gaW5kZXg7XHJcblx0XHRcdH1cclxuXHJcbi8vIElmIHNjb3BlIGlzIG5vdCBpc29sYXRlZCB0aGVuIGFkZCBhIHJlZmVyZW5jZSB0byB0aGUgcGFyZW50IGRhdGEuXHJcblx0XHRcdGlmICghc2NvcGUgJiYgcGFyZW50X2RhdGEpIHtcclxuXHRcdFx0XHR0aGlzLl9wYXJlbnQgPSBwYXJlbnRfZGF0YTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcbi8vIElmIHNjb3BlIGlzIG5vdCBpc29sYXRlZCB0aGVuIHNldCB0aGUgcHJvdG90eXBlLiBJbmhlcml0aW5nIGZyb20gZGF0YSBwYXJlbnQgaXMgdGhlIGRlZmF1bHQgYW5kIGhhbmRsZWQgYXV0b21hdGljYWxseSBpbiBKUy5cclxuXHRpZiAoIXNjb3BlKSB7XHJcblx0XHREYXRhLnByb3RvdHlwZSA9IHBhcmVudF9kYXRhO1xyXG5cdH1cclxuXHR2YXIgb3V0cHV0ID0gbmV3IERhdGEodGVtcGxhdGVfb2JqZWN0KTtcclxuXHRyZXR1cm4gb3V0cHV0O1xyXG59XHJcbiIsIlxyXG52YXIgZXh0ZW5kID0gZnVuY3Rpb24oZWxlLHNjb3BlLHZhbHVlKXtcclxuXHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0dGhyb3coXCJObyB2YWx1ZSBmb3IgcHJvcGVydHkgJ2RpbGwtZXh0ZW5kcycgb24gZGlsbC1leHRlbmRzPVxcXCJcIiArIGVsZS5hdHRyaWJ1dGVzW1wiZGlsbC1leHRlbmRzXCJdLm5vZGVWYWx1ZSArIFwiXFxcIlwiKTtcclxuXHR9XHJcblx0T2JqZWN0LmtleXModmFsdWUpLmZvckVhY2goZnVuY3Rpb24oa2V5KXtcclxuXHRcdHZhciBwcm9wID0ga2V5LFxyXG5cdFx0XHRsZW5ndGggPSBwcm9wLmxlbmd0aCxcclxuXHRcdFx0bWlkZGxlID0gcHJvcC5zdWJzdHJpbmcoMSxsZW5ndGgtMSksXHJcblx0XHRcdGhhc190aGlzX3dyYXBwZXIgPSBmdW5jdGlvbihzdGFydCxlbmQpe1xyXG5cdFx0XHRcdHJldHVybiBwcm9wLnN1YnN0cigwLHN0YXJ0Lmxlbmd0aCkgPT09IHN0YXJ0ICYmIHByb3Auc3Vic3RyKGxlbmd0aC1lbmQubGVuZ3RoLGxlbmd0aCkgPT09IGVuZDtcclxuXHRcdFx0fTtcclxuXHRcdGlmIChoYXNfdGhpc193cmFwcGVyKFwiWyhcIixcIildXCIpKSB7XHJcblx0XHRcdHByb3AgPSBcIjpcIiArIHByb3Auc3Vic3RyaW5nKDIsbGVuZ3RoLTIpICsgXCI6XCI7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmIChoYXNfdGhpc193cmFwcGVyKFwiW1wiLFwiXVwiKSkge1xyXG5cdFx0XHRwcm9wID0gXCI6XCIgKyBtaWRkbGU7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmIChoYXNfdGhpc193cmFwcGVyKFwiKFwiLFwiKVwiKSkge1xyXG5cdFx0XHRwcm9wID0gbWlkZGxlICsgXCI6XCI7XHJcblx0XHR9XHJcblx0XHRlbGUuc2V0QXR0cmlidXRlKHByb3AsdmFsdWVba2V5XSk7XHJcblx0fS5iaW5kKHRoaXMpKTtcclxufVxyXG5cclxud2luZG93Ll9kaWxsLmRpbGxfZXh0ZW5kcyA9IGZ1bmN0aW9uKHRhcmdldCxkYXRhKXtcclxuXHRpZiAodGFyZ2V0Lmhhc0F0dHJpYnV0ZShcImRpbGwtZXh0ZW5kc1wiKSkge1xyXG5cdFx0ZXh0ZW5kLmFwcGx5KHRoaXMsW3RhcmdldCxkYXRhLGRhdGFbdGFyZ2V0LmF0dHJpYnV0ZXNbXCJkaWxsLWV4dGVuZHNcIl0ubm9kZVZhbHVlXV0pO1xyXG5cdFx0dGFyZ2V0LnJlbW92ZUF0dHJpYnV0ZShcImRpbGwtZXh0ZW5kc1wiKTtcclxuXHR9XHJcbn1cclxuIiwiXHJcbndpbmRvdy5fZGlsbC50ZW1wbGF0ZV9mb3IgPSBmdW5jdGlvbih0YXJnZXQsdGVtcGxhdGUpe1xyXG5cdGlmICghdGFyZ2V0Lmhhc0F0dHJpYnV0ZShcImRpbGwtZm9yXCIpKSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cdHZhciB2YWx1ZSA9IHRhcmdldC5hdHRyaWJ1dGVzW1wiZGlsbC1mb3JcIl0ubm9kZVZhbHVlO1xyXG5cdGlmICghdGVtcGxhdGUuZGF0YVt2YWx1ZV0pIHtcclxuXHJcblx0fVxyXG5cdHRhcmdldC5yZW1vdmVBdHRyaWJ1dGUoXCJkaWxsLWZvclwiKTtcclxuXHR0ZW1wbGF0ZS5mb3IgPSB7XHJcblx0XHRjbG9uZTogdGFyZ2V0LmNsb25lTm9kZSh0cnVlKSxcclxuXHRcdHZhbHVlOiB2YWx1ZSxcclxuXHRcdGN1cnJlbnQ6IDFcclxuXHR9O1xyXG59XHJcblxyXG53aW5kb3cuX2RpbGwucmVuZGVyX2ZvciA9IGZ1bmN0aW9uKHJlbmRlcixjb25kaXRpb24pe1xyXG5cdGlmICghcmVuZGVyIGluc3RhbmNlb2YgdGhpcy5SZW5kZXIpIHtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblx0dmFyIHRhcmdldCA9IHJlbmRlci50YXJnZXQsXHJcblx0XHRmaXJzdF9lbGVtZW50ID0gdGFyZ2V0LFxyXG5cdFx0dGVtcGxhdGUgPSByZW5kZXIudGVtcGxhdGUsXHJcblx0XHRwYXJlbnQgPSB0YXJnZXQucGFyZW50Tm9kZSxcclxuXHRcdGksXHJcblx0XHRjdXJyZW50ID0gdGVtcGxhdGUuZm9yLmN1cnJlbnQsXHJcblx0XHRpdGVtcyA9IHRoaXMuZXZhbHVhdG9yKHRlbXBsYXRlLmZvci52YWx1ZSx0ZW1wbGF0ZS5kYXRhKTtcclxuXHJcblx0aWYgKGNvbmRpdGlvbikge1xyXG5cdFx0aWYgKGN1cnJlbnQgIT09IDApIHtcclxuXHRcdFx0Zm9yIChpPTA7aTxjdXJyZW50LTE7aSsrKSB7XHJcblx0XHRcdFx0cGFyZW50LnJlbW92ZUNoaWxkKHRhcmdldC5uZXh0RWxlbWVudFNpYmxpbmcpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRhcmdldCA9IHRhcmdldC5wcmV2aW91c1NpYmxpbmc7XHJcblx0XHRcdHBhcmVudC5yZW1vdmVDaGlsZChmaXJzdF9lbGVtZW50KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHR0YXJnZXQgPSB0YXJnZXQucHJldmlvdXNTaWJsaW5nO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRlbXBsYXRlLmZvci5jdXJyZW50ID0gaXRlbXMubGVuZ3RoO1xyXG5cclxuXHRcdGZvciAoaT0wO2k8aXRlbXMubGVuZ3RoO2krKykge1xyXG5cdFx0XHRpZiAoaSA9PT0gMCAmJiB0YXJnZXQgPT09IG51bGwpIHtcclxuXHRcdFx0XHRpZiAocGFyZW50LmNoaWxkTm9kZXMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0XHRwYXJlbnQuYXBwZW5kQ2hpbGQodGVtcGxhdGUuZm9yLmNsb25lLmNsb25lTm9kZSh0cnVlKSk7XHJcblx0XHRcdFx0XHR0YXJnZXQgPSBwYXJlbnQuY2hpbGRyZW5bMF07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0cGFyZW50Lmluc2VydEJlZm9yZSh0ZW1wbGF0ZS5mb3IuY2xvbmUuY2xvbmVOb2RlKHRydWUpLCBwYXJlbnQuY2hpbGROb2Rlc1swXSk7XHJcblx0XHRcdFx0XHR0YXJnZXQgPSBwYXJlbnQuY2hpbGRyZW5bMV07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHRhcmdldC5yZW1vdmVBdHRyaWJ1dGUoXCJkaWxsLWZvclwiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRpZiAodGFyZ2V0Lm5leHRTaWJsaW5nID09PSBudWxsKSB7XHJcblx0XHRcdFx0XHRwYXJlbnQuYXBwZW5kQ2hpbGQodGVtcGxhdGUuZm9yLmNsb25lLmNsb25lTm9kZSh0cnVlKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0cGFyZW50Lmluc2VydEJlZm9yZSh0ZW1wbGF0ZS5mb3IuY2xvbmUuY2xvbmVOb2RlKHRydWUpLCB0YXJnZXQubmV4dFNpYmxpbmcpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHR0YXJnZXQgPSB0YXJnZXQubmV4dEVsZW1lbnRTaWJsaW5nO1xyXG5cdFx0XHRpZiAoaSA9PT0gMCkge1xyXG5cdFx0XHRcdGZpcnN0X2VsZW1lbnQgPSB0YXJnZXQ7XHJcblx0XHRcdH1cclxuXHRcdFx0dGFyZ2V0LnJlbW92ZUF0dHJpYnV0ZShcImRpbGwtZm9yXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0KGZ1bmN0aW9uKCl7XHJcblx0XHR2YXIgX3RhcmdldCA9IGZpcnN0X2VsZW1lbnQsXHJcblx0XHRcdF9kYXRhO1xyXG5cdFx0Zm9yICh2YXIgaT0wO2k8aXRlbXMubGVuZ3RoO2krKykge1xyXG5cdFx0XHRfZGF0YSA9IHRoaXMuY3JlYXRlX2RhdGFfb2JqZWN0KHtcclxuXHRcdFx0XHR0ZW1wbGF0ZV9vYmplY3Q6aXRlbXNbaV0sXHJcblx0XHRcdFx0cGFyZW50X2RhdGE6dGVtcGxhdGUuZGF0YSxcclxuXHRcdFx0XHRpbmRleDppXHJcblx0XHRcdH0pO1xyXG5cclxuXHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIkZvcjogXCIsXHJcblxyXG5cdFx0XHRcdGNvbmRpdGlvbixcclxuXHJcblx0XHRcdFx0cmVuZGVyLmNvbmRpdGlvbiA9PT0gdW5kZWZpbmVkIHx8IChyZW5kZXIuY29uZGl0aW9uIGluc3RhbmNlb2YgRWxlbWVudFxyXG5cdFx0XHRcdFx0PyByZW5kZXIuY29uZGl0aW9uID09PSBfdGFyZ2V0XHJcblx0XHRcdFx0XHQ6IHJlbmRlci5jb25kaXRpb24gaW5zdGFuY2VvZiByZWYuQ29tcG9uZW50XHJcblx0XHRcdFx0XHRcdD8gcmVuZGVyLmNvbmRpdGlvbiA9PT0gdGVtcGxhdGUuY29tcG9uZW50XHJcblx0XHRcdFx0XHRcdDogZmFsc2UpLFxyXG5cdFx0XHRcdF90YXJnZXRcclxuXHJcblx0XHRcdCk7XHJcblxyXG5cclxuXHJcblxyXG5cclxuXHRcdFx0dGhpcy5yZW5kZXJfZWxlbWVudChcclxuXHRcdFx0XHRmdW5jdGlvbigpe1xyXG5cdFx0XHRcdFx0dmFyIG5ld19yZW5kZXIgPSBuZXcgcmVmLlJlbmRlcihfdGFyZ2V0LHRoaXMuY3JlYXRlX3RlbXBsYXRlKF90YXJnZXQsX2RhdGEsdGVtcGxhdGUubW9kdWxlKSk7XHJcblx0XHRcdFx0XHRuZXdfcmVuZGVyLmNvbmRpdGlvbiA9IHJlbmRlci5jb25kaXRpb247XHJcblx0XHRcdFx0XHRyZXR1cm4gbmV3X3JlbmRlcjtcclxuXHRcdFx0XHR9LmFwcGx5KHRoaXMpLFxyXG5cclxuXHJcblxyXG5cclxuXHRcdFx0XHRyZW5kZXIuY29uZGl0aW9uID09PSB1bmRlZmluZWQgfHwgKHJlbmRlci5jb25kaXRpb24gaW5zdGFuY2VvZiBFbGVtZW50XHJcblx0XHRcdFx0XHQ/IHJlbmRlci5jb25kaXRpb24gPT09IF90YXJnZXRcclxuXHRcdFx0XHRcdDogcmVuZGVyLmNvbmRpdGlvbiBpbnN0YW5jZW9mIHJlZi5Db21wb25lbnRcclxuXHRcdFx0XHRcdFx0PyByZW5kZXIuY29uZGl0aW9uID09PSB0ZW1wbGF0ZS5jb21wb25lbnRcclxuXHRcdFx0XHRcdFx0OiBmYWxzZSlcclxuXHJcblxyXG5cclxuXHJcblxyXG5cdFx0XHQpO1xyXG5cdFx0XHRfdGFyZ2V0ID0gX3RhcmdldC5uZXh0RWxlbWVudFNpYmxpbmc7XHJcblx0XHR9XHJcblx0fS5hcHBseSh0aGlzKSk7XHJcblx0cmV0dXJuIGl0ZW1zLmxlbmd0aDtcclxufVxyXG4iLCJcclxud2luZG93Ll9kaWxsLnRlbXBsYXRlX2lmID0gZnVuY3Rpb24odGFyZ2V0LHRlbXBsYXRlLG9wdGlvbnMpe1xyXG5cdGlmICghdGFyZ2V0Lmhhc0F0dHJpYnV0ZShcImRpbGwtaWZcIikpIHtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblx0dmFyIHZhbHVlID0gdGFyZ2V0LmF0dHJpYnV0ZXNbXCJkaWxsLWlmXCJdLm5vZGVWYWx1ZTtcclxuXHR0ZW1wbGF0ZS5pZiA9IHtcclxuXHRcdGVsZW1lbnQ6IHRhcmdldCxcclxuXHRcdHZhbHVlOiB2YWx1ZSxcclxuXHRcdGluaXRpYWw6IChvcHRpb25zICYmIG9wdGlvbnMuZm9yKVxyXG5cdFx0XHQ/IHR5cGVvZiB0ZW1wbGF0ZS5kYXRhW3ZhbHVlXSA9PT0gXCJmdW5jdGlvblwiID8gdGVtcGxhdGUuZGF0YVt2YWx1ZV0oKSA6IHRlbXBsYXRlLmRhdGFbdmFsdWVdXHJcblx0XHRcdDogdHJ1ZSxcclxuXHRcdHBhcmVudDogdGFyZ2V0LnBhcmVudE5vZGUsXHJcblx0XHRmaXJzdDogdHJ1ZVxyXG5cdH1cclxuXHR0YXJnZXQucmVtb3ZlQXR0cmlidXRlKFwiZGlsbC1pZlwiKTtcclxufVxyXG5cclxud2luZG93Ll9kaWxsLnJlbmRlcl9pZiA9IGZ1bmN0aW9uKHRhcmdldCx0ZW1wbGF0ZSl7XHJcblx0dmFyIGRhdGEgPSB0ZW1wbGF0ZS5kYXRhLFxyXG5cdFx0aGFzX2NvbXBvbmVudCA9ICEhdGVtcGxhdGUuY29tcG9uZW50LFxyXG5cdFx0X2lmID0gdGVtcGxhdGUuaWYsXHJcblx0XHRwYXJlbnQgPSB0YXJnZXQucGFyZW50Tm9kZSxcclxuXHRcdGlmX3ZhbHVlID0gdGhpcy5ldmFsdWF0b3IoX2lmLnZhbHVlLGRhdGEpO1xyXG5cdGlmICghX2lmLmluaXRpYWwgJiYgaWZfdmFsdWUpIHtcclxuXHRcdHRhcmdldCA9PT0gdW5kZWZpbmVkXHJcblx0XHRcdD8gX2lmLnBhcmVudC5hcHBlbmRDaGlsZChfaWYuZWxlbWVudClcclxuXHRcdFx0OiBwYXJlbnQuaW5zZXJ0QmVmb3JlKF9pZi5lbGVtZW50LHRhcmdldCk7XHJcblx0XHR0YXJnZXQgPSBfaWYuZWxlbWVudDtcclxuXHRcdF9pZi5pbml0aWFsID0gaWZfdmFsdWU7XHJcblx0XHRoYXNfY29tcG9uZW50XHJcblx0XHRcdCYmIGRhdGEuaGFzT3duUHJvcGVydHkoXCJvbmluaXRcIilcclxuXHRcdFx0JiYgZGF0YS5vbmluaXQoKTtcclxuXHR9XHJcblx0ZWxzZSBpZiAoX2lmLmluaXRpYWwgJiYgIWlmX3ZhbHVlKSB7XHJcblx0XHRfaWYuZmlyc3QgJiYgKGRlbGV0ZSBfaWYuZmlyc3QpO1xyXG5cdFx0cGFyZW50LnJlbW92ZUNoaWxkKHRhcmdldCk7XHJcblx0XHRfaWYuaW5pdGlhbCA9IGlmX3ZhbHVlO1xyXG5cdFx0IV9pZi5maXJzdFxyXG5cdFx0XHQmJiBoYXNfY29tcG9uZW50XHJcblx0XHRcdCYmIGRhdGEuaGFzT3duUHJvcGVydHkoXCJvbmRlc3Ryb3lcIilcclxuXHRcdFx0JiYgZGF0YS5vbmRlc3Ryb3koKTtcclxuXHRcdHJldHVybiAwO1xyXG5cdH1cclxuXHRlbHNlIGlmICghX2lmLmluaXRpYWwgJiYgIWlmX3ZhbHVlKSB7XHJcblx0XHRyZXR1cm4gMDtcclxuXHR9XHJcblx0cmV0dXJuIHRhcmdldDtcclxufVxyXG4iLCJcclxud2luZG93Ll9kaWxsLmRpbGxfdGVtcGxhdGUgPSBmdW5jdGlvbih0YXJnZXQsdGVtcGxhdGUpe1xyXG5cdHZhciBfdGVtcGxhdGUsXHJcblx0XHR2YWx1ZTtcclxuXHRpZiAodGFyZ2V0Lmhhc0F0dHJpYnV0ZShcImRpbGwtdGVtcGxhdGVcIikpIHtcclxuXHRcdHZhbHVlID0gdGVtcGxhdGUuZGF0YVt0YXJnZXQuYXR0cmlidXRlc1tcImRpbGwtdGVtcGxhdGVcIl0ubm9kZVZhbHVlXTtcclxuXHRcdHRlbXBsYXRlLnRlbXBsYXRlID0gdmFsdWU7XHJcblx0XHR0YXJnZXQucmVtb3ZlQXR0cmlidXRlKFwiZGlsbC10ZW1wbGF0ZVwiKTtcclxuXHR9XHJcbn1cclxuIiwiXHJcbnZhciBDb21wb25lbnQgPSBmdW5jdGlvbihuYW1lLGRhdGEsdGVtcGxhdGVfbGl0ZXJhbCxpc29sYXRlKXtcclxuXHR0aGlzLm5hbWUgPSBuYW1lO1xyXG5cdHRoaXMuZGF0YSA9IGRhdGE7XHJcblx0dGhpcy50ZW1wbGF0ZSA9IHRlbXBsYXRlX2xpdGVyYWw7XHJcblx0dGhpcy5pc29sYXRlID0gaXNvbGF0ZSB8fCBmYWxzZTtcclxufVxyXG5cclxudmFyIHJlZiA9IHdpbmRvdy5fZGlsbDtcclxuXHJcbnJlZi5Db21wb25lbnQgPSBDb21wb25lbnQ7XHJcblxyXG5yZWYuZ2VuZXJhdGVfY29tcG9uZW50ID0gZnVuY3Rpb24obmFtZSxkYXRhLHRlbXBsYXRlX2xpdGVyYWwsaXNvbGF0ZSl7XHJcblx0cmV0dXJuIG5ldyBDb21wb25lbnQobmFtZSxkYXRhLHRlbXBsYXRlX2xpdGVyYWwsaXNvbGF0ZSk7XHJcbn07XHJcbiIsIlxyXG53aW5kb3cuX2RpbGwudGVtcGxhdGVfY29tcG9uZW50ID0gZnVuY3Rpb24odGFyZ2V0LHRlbXBsYXRlKXtcclxuXHJcbi8vIENoZWNrIHRoYXQgdG8gc2VlIGlmIHRoaXMgZWxlbWVudCBpcyBhY3R1YWxseSBhIGNvbXBvbmVudCBvbiB0aGlzIG1vZHVsZSwgaWYgbm90IHRoZW4gcmV0dXJuIHVuZGVmaW5lZCBhbmQgZG8gbm90IHByb2Nlc3MgZWxlbWVudCBhcyBhIGNvbXBvbmVudC5cclxuXHR2YXIgY3VycmVudF9jb21wb25lbnQgPSB0ZW1wbGF0ZS5tb2R1bGUuY29tcG9uZW50c1t0YXJnZXQubm9kZU5hbWUudG9Mb3dlckNhc2UoKV07XHJcblx0aWYgKCFjdXJyZW50X2NvbXBvbmVudCkge1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHR0ZW1wbGF0ZS5jb21wb25lbnQgPSBjdXJyZW50X2NvbXBvbmVudDtcclxuXHRpZiAodHlwZW9mIGN1cnJlbnRfY29tcG9uZW50LmRhdGEgPT09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0Y3VycmVudF9jb21wb25lbnQuZGF0YSA9IG5ldyBjdXJyZW50X2NvbXBvbmVudC5kYXRhKCk7XHJcblx0fVxyXG5cdHRlbXBsYXRlLmRhdGEgPSB0aGlzLmNyZWF0ZV9kYXRhX29iamVjdCh7XHJcblx0XHR0ZW1wbGF0ZV9vYmplY3Q6IGN1cnJlbnRfY29tcG9uZW50LmRhdGEsXHJcblx0XHRwYXJlbnRfZGF0YTogdGVtcGxhdGUuZGF0YSxcclxuXHRcdHNjb3BlOiAhIXRhcmdldC5oYXNBdHRyaWJ1dGUoXCJkaWxsLWlzb2xhdGVcIilcclxuXHR9KTtcclxuXHR0ZW1wbGF0ZS5kYXRhLl90ZW1wbGF0ZSA9IHRhcmdldC5pbm5lckhUTUw7XHJcblx0dGFyZ2V0LmlubmVySFRNTCA9IGN1cnJlbnRfY29tcG9uZW50LnRlbXBsYXRlO1xyXG5cdHRlbXBsYXRlLmRhdGEuX21vZHVsZSA9IHRlbXBsYXRlLm1vZHVsZTtcclxuXHR0ZW1wbGF0ZS5tb2R1bGUgPSBjdXJyZW50X2NvbXBvbmVudC5tb2R1bGU7XHJcbn1cclxuIiwiXHJcbnZhciBTZXJ2aWNlID0gZnVuY3Rpb24obmFtZSxpbnB1dCxpc29sYXRlKXtcclxuXHR0aGlzLm5hbWUgPSBuYW1lO1xyXG5cdHRoaXMuZGF0YSA9IHR5cGVvZiBpbnB1dCA9PT0gXCJmdW5jdGlvblwiXHJcblx0XHQ/IG5ldyBpbnB1dCgpXHJcblx0XHQ6IHR5cGVvZiBpbnB1dCA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheShpbnB1dClcclxuXHRcdFx0PyBpbnB1dFxyXG5cdFx0XHQ6IG51bGw7XHJcblx0dGhpcy5pc29sYXRlID0gaXNvbGF0ZSB8fCBmYWxzZTtcclxufVxyXG5cclxudmFyIHJlZiA9IHdpbmRvdy5fZGlsbDtcclxuXHJcbnJlZi5TZXJ2aWNlID0gU2VydmljZTtcclxuXHJcbnJlZi5nZW5lcmF0ZV9zZXJ2aWNlID0gZnVuY3Rpb24obmFtZSxpbnB1dCxpc29sYXRlKXtcclxuXHRyZXR1cm4gbmV3IFNlcnZpY2UobmFtZSxpbnB1dCxpc29sYXRlKTtcclxufTtcclxuIiwiXHJcbnZhciByZWYgPSB3aW5kb3cuX2RpbGw7XHJcblxyXG52YXIgTW9kdWxlID0gZnVuY3Rpb24obmFtZSxtb2R1bGVzKXtcclxuXHR0aGlzLm5hbWUgPSBuYW1lO1xyXG5cdHRoaXMuY29tcG9uZW50cyA9IHt9O1xyXG5cdHRoaXMuc2VydmljZXMgPSB7fTtcclxuXHRtb2R1bGVzICYmIG1vZHVsZXMuZm9yRWFjaChmdW5jdGlvbih4KXtcclxuXHRcdGlmICh0eXBlb2YgeCA9PT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHR4ID0gZGlsbC5nZXRfbW9kdWxlKHgpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZiAoISh4IGluc3RhbmNlb2YgTW9kdWxlKSkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRPYmplY3Qua2V5cyh4LmNvbXBvbmVudHMpLmZvckVhY2goZnVuY3Rpb24oY29tcG9uZW50KXtcclxuXHRcdFx0aWYgKHguY29tcG9uZW50c1tjb21wb25lbnRdLmlzb2xhdGUpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5jb21wb25lbnRzW2NvbXBvbmVudF0gPSB4LmNvbXBvbmVudHNbY29tcG9uZW50XTtcclxuXHRcdH0uYmluZCh0aGlzKSk7XHJcblx0XHRPYmplY3Qua2V5cyh4LnNlcnZpY2VzKS5mb3JFYWNoKGZ1bmN0aW9uKHNlcnZpY2Upe1xyXG5cdFx0XHRpZiAoeC5zZXJ2aWNlc1tzZXJ2aWNlXS5pc29sYXRlKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMuc2VydmljZXNbc2VydmljZV0gPSB4LnNlcnZpY2VzW3NlcnZpY2VdO1xyXG5cdFx0fS5iaW5kKHRoaXMpKTtcclxuXHR9LmJpbmQodGhpcykpO1xyXG59XHJcblxyXG5Nb2R1bGUucHJvdG90eXBlID0ge1xyXG5cdHNldF9jb21wb25lbnQ6IGZ1bmN0aW9uKGNvbXBvbmVudCl7XHJcblx0XHR0aGlzLmNvbXBvbmVudHNbY29tcG9uZW50Lm5hbWVdID0gY29tcG9uZW50O1xyXG5cdFx0Y29tcG9uZW50Lm1vZHVsZSA9IHRoaXM7XHJcblx0fSxcclxuXHRzZXRfc2VydmljZTogZnVuY3Rpb24oc2VydmljZSl7XHJcblx0XHR0aGlzLnNlcnZpY2VzW3NlcnZpY2UubmFtZV0gPSBzZXJ2aWNlLmRhdGE7XHJcblx0fVxyXG59XHJcblxyXG5yZWYuTW9kdWxlID0gTW9kdWxlO1xyXG5cclxucmVmLmNyZWF0ZV9tb2R1bGUgPSBmdW5jdGlvbihuYW1lLG1vZHVsZXMpe1xyXG5cdHJldHVybiByZWYubG9jayhuZXcgTW9kdWxlKG5hbWUsbW9kdWxlcykpO1xyXG59XHJcbiIsIlxyXG53aW5kb3cuX2RpbGwuY3JlYXRlX2F0dHJpYnV0ZXMgPSBmdW5jdGlvbih0YXJnZXQsdGVtcGxhdGUscGFyZW50X2RhdGEpe1xyXG5cdHZhciBvdXRwdXQgPSBbXTtcclxuXHR0aGlzLmZvcl9lYWNoKHRhcmdldC5hdHRyaWJ1dGVzLGZ1bmN0aW9uKGF0dHIpe1xyXG5cdFx0dmFyIG5hbWUgPSBhdHRyLm5vZGVOYW1lLFxyXG5cdFx0XHR2YWx1ZSA9IGF0dHIubm9kZVZhbHVlLFxyXG5cdFx0XHRldmVudF9uYW1lLFxyXG5cdFx0XHRuYW1lX2xlbmd0aCA9IG5hbWUubGVuZ3RoLFxyXG5cdFx0XHR2YWx1ZV9sZW5ndGggPSB2YWx1ZS5sZW5ndGgsXHJcblx0XHRcdGZpcnN0ID0gbmFtZS5jaGFyQXQoMCksXHJcblx0XHRcdGxhc3QgPSBuYW1lLmNoYXJBdChuYW1lX2xlbmd0aC0xKSxcclxuXHRcdFx0bGl0ZXJhbCA9IHZhbHVlLmNoYXJBdCgwKSA9PT0gXCInXCIgJiYgdmFsdWUuY2hhckF0KHZhbHVlX2xlbmd0aC0xLDEpID09PSBcIidcIixcclxuXHRcdFx0cmVtb3ZlX2F0dHJpYnV0ZSA9IGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0dGFyZ2V0LnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0ZGVmaW5lID0gZnVuY3Rpb24obmFtZSxnZXR0ZXIsIHNldHRlcil7XHJcblx0XHRcdFx0dmFyIGNvbnN0cnVjdCA9IHt9O1xyXG5cdFx0XHRcdGlmIChnZXR0ZXIpe1xyXG5cdFx0XHRcdFx0Y29uc3RydWN0LmdldCA9IGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0XHRcdHJldHVybiBwYXJlbnRfZGF0YVt2YWx1ZV07XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmIChzZXR0ZXIpIHtcclxuXHRcdFx0XHRcdGNvbnN0cnVjdC5zZXQgPSBmdW5jdGlvbihfdmFsdWUpe1xyXG5cdFx0XHRcdFx0XHR0aGlzW3ZhbHVlXSA9IF92YWx1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRlbXBsYXRlLmRhdGEsbmFtZSxjb25zdHJ1Y3QpO1xyXG5cdFx0XHR9O1xyXG5cdFx0aWYgKGZpcnN0ID09PSBcIiNcIikge1xyXG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGVtcGxhdGUuZGF0YSxuYW1lLnN1YnN0cmluZygxLG5hbWUubGVuZ3RoKSx7XHJcblx0XHRcdFx0Z2V0OiBmdW5jdGlvbigpe1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRhcmdldDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRyZXR1cm4gcmVtb3ZlX2F0dHJpYnV0ZSgpO1xyXG5cdFx0fVxyXG5cdC8vIElmIGF0dHJpYnV0ZSBpcyBiaW5kYWJsZSAoc3Vycm91bmRlZCBieSBzcXVhcmUgYnJhY2tldHMgb3Igc3RhcnRlZCB3aXRoIDopIHRoZW4gc2F2ZSB0aGlzIHRvIHRoZSB0ZW1wbGF0ZS5cclxuXHQvLyBTcXVhcmUgYnJhY2tldCBub3RhdGlvbiBpcyBub3QgdmFsaWQgc3ludGF4IHdoZW4gc2V0dGluZyBhdHRyaWJ1dGVzIHNvIHVzZSA6IGluc3RlYWQuXHJcblx0Ly8gU3F1YXJlIGJyYWNrZXRzIG1ha2UgZGV2ZWxvcGluZyBlYXNpZXIgYXMgdGhlIGxvZ2ljIGlzIGVhc2llciB0byBzZWUuXHJcblx0XHRpZiAoIChmaXJzdCA9PT0gXCJbXCIgJiYgbGFzdCA9PT0gXCJdXCIpIHx8IGZpcnN0ID09PSBcIjpcIiApIHtcclxuXHRcdFx0aWYgKHRlbXBsYXRlLmNvbXBvbmVudCkge1xyXG5cdFx0XHRcdGRlZmluZSh0aGlzLnN1YnN0cmluZyhuYW1lLDEsbmFtZV9sZW5ndGgtMSksdHJ1ZSxmYWxzZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0b3V0cHV0LnB1c2goe1xyXG5cdFx0XHRcdFx0bmFtZTogdGhpcy5zdWJzdHJpbmcobmFtZSwxLG5hbWVfbGVuZ3RoLShmaXJzdCAhPT0gXCI6XCIpKSxcclxuXHRcdFx0XHRcdHZhbHVlOiBsaXRlcmFsXHJcblx0XHRcdFx0XHRcdD8gdGhpcy5zdWJzdHJpbmcodmFsdWUsMSx2YWx1ZV9sZW5ndGgtMSlcclxuXHRcdFx0XHRcdFx0OiB2YWx1ZSxcclxuXHRcdFx0XHRcdHR5cGU6IGxpdGVyYWxcclxuXHRcdFx0XHRcdFx0PyBcImxpdGVyYWxcIlxyXG5cdFx0XHRcdFx0XHQ6IFwiYmluZFwiXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHJlbW92ZV9hdHRyaWJ1dGUoKTtcclxuXHRcdH1cclxuXHJcblx0Ly8gSWYgdGhlIGF0dHJpYnV0ZSBpcyBzdXJyb3VuZGVkIGJ5IHBhcmVudGhlc2lzICggKGEpICksIG9yIGVuZHMgd2l0aCA6IHRoZW4gYXNzaWduIGEgbmFtZSBhcyBhbiBldmVudCBsaXN0ZW5lci5cclxuXHRcdGlmICggKGZpcnN0ID09PSBcIihcIiAmJiBsYXN0ID09PSBcIilcIikgfHwgbGFzdCA9PT0gXCI6XCIgKSB7XHJcblx0XHRcdGlmICh0ZW1wbGF0ZS5jb21wb25lbnQpIHtcclxuXHRcdFx0XHRkZWZpbmUodGhpcy5zdWJzdHJpbmcobmFtZSwxLG5hbWVfbGVuZ3RoLTEpLGZhbHNlLHRydWUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdGV2ZW50X25hbWUgPSB0aGlzLnN1YnN0cmluZyhcclxuXHRcdFx0XHRcdG5hbWUsXHJcblx0XHRcdFx0XHRsYXN0ID09PSBcIjpcIlxyXG5cdFx0XHRcdFx0XHQ/IDBcclxuXHRcdFx0XHRcdFx0OiAxLFxyXG5cdFx0XHRcdFx0bmFtZV9sZW5ndGgtMVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRfbmFtZSxmdW5jdGlvbihldmVudCl7XHJcblx0XHRcdFx0XHR2YXIgcmV0dXJucztcclxuXHRcdFx0XHRcdGlmICh0ZW1wbGF0ZS5kYXRhW3ZhbHVlXSA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0XHRcdGRpbGwuY2hhbmdlKCk7XHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHJldHVybnMgPSB0ZW1wbGF0ZS5kYXRhW3ZhbHVlXS5hcHBseSh0ZW1wbGF0ZS5kYXRhLFtldmVudCx0YXJnZXRdKTtcclxuXHRcdFx0XHRcdGlmIChyZXR1cm5zID09PSBmYWxzZSkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRkaWxsLmNoYW5nZSgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiByZW1vdmVfYXR0cmlidXRlKCk7XHJcblx0XHR9XHJcblx0XHRpZiAobmFtZS5zdWJzdHIoMCw1KSA9PT0gXCJkaWxsLVwiKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdGlmICh0ZW1wbGF0ZS5jb21wb25lbnQpIHtcclxuXHRcdFx0dGVtcGxhdGUuZGF0YVtuYW1lXSA9IHBhcmVudF9kYXRhW3ZhbHVlXTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRvdXRwdXQucHVzaCh7XHJcblx0XHRcdFx0bmFtZTogbmFtZSxcclxuXHRcdFx0XHR2YWx1ZTogbGl0ZXJhbFxyXG5cdFx0XHRcdFx0PyB0aGlzLnN1YnN0cmluZyh2YWx1ZSwxLHZhbHVlX2xlbmd0aC0xKVxyXG5cdFx0XHRcdFx0OiB2YWx1ZSxcclxuXHRcdFx0XHR0eXBlOiBsaXRlcmFsXHJcblx0XHRcdFx0XHQ/IFwibGl0ZXJhbFwiXHJcblx0XHRcdFx0XHQ6IFwiZGVmYXVsdFwiXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH0uYmluZCh0aGlzKSk7XHJcblx0cmV0dXJuIG91dHB1dDtcclxufVxyXG4iLCJcclxudmFyIFRlbXBsYXRlID0gZnVuY3Rpb24obmFtZSxkYXRhLG1vZHVsZSl7XHJcblx0dGhpcy50eXBlID0gbmFtZTtcclxuXHR0aGlzLmRhdGEgPSBkYXRhO1xyXG5cdHRoaXMubW9kdWxlID0gbW9kdWxlO1xyXG5cdHRoaXMuZGF0YS5fbW9kdWxlID0gbW9kdWxlO1xyXG59XHJcblxyXG52YXIgcmVmID0gd2luZG93Ll9kaWxsO1xyXG5cclxuLy8gVGhpcyBmdW5jdGlvbiBwcm9kdWNlcyBhIHRlbXBsYXRlIG9iamVjdCB3aGljaCByZXByZXNlbnRzIGFuIGVsZW1lbnQgaW5zaWRlIHRoZSB0YXJnZXQgc2VjdGlvbiBvbiBET00gZm9yIERpbGwuXHJcbi8vIFRoZSB0ZW1wbGF0ZSBvYmplY3QgaXMgZXh0ZW5kZWQgd2hpY2ggbW9yZSBicmFuY2hlcyBmb3IgZWFjaCBjaGlsZCBvZiB0aGUgZWxlbWVudC5cclxucmVmLmNyZWF0ZV90ZW1wbGF0ZSA9IGZ1bmN0aW9uKHRhcmdldCxkYXRhLG1vZHVsZSxvcHRpb25zKXtcclxuXHR2YXIgdGVtcGxhdGUgPSBuZXcgVGVtcGxhdGUodGFyZ2V0Lm5vZGVOYW1lLGRhdGEsbW9kdWxlKSxcclxuXHRcdGhhc19mb3IsXHJcblx0XHRfZGF0YSA9IHRlbXBsYXRlLmRhdGE7XHJcblxyXG4vLyBJZiB0aGUgZWxlbWVudCBpcyBhIHRleHQgbm9kZSBvciBjb21tZW50IHRoZW4gdGhhdCBpcyB0aGUgZW5kIG9mIHRoZSB0ZW1wbGF0ZSBicmFuY2guXHJcblx0aWYgKHRhcmdldC5ub2RlTmFtZSA9PT0gXCIjdGV4dFwiIHx8IHRhcmdldC5ub2RlTmFtZSA9PT0gXCIjY29tbWVudFwiKSB7XHJcblx0XHR0ZW1wbGF0ZS52YWx1ZSA9IHRhcmdldC5ub2RlVmFsdWU7XHJcblx0XHRyZXR1cm4gdGVtcGxhdGU7XHJcblx0fVxyXG5cclxuLy8gSWYgdGhlIGZ1bmN0aW9uIGV4aXN0cyBoYW5kbGUgdGhlIGRpbGwtZXh0ZW5kcyBhdHRyaWJ1dGUuXHJcblx0dGhpcy5kaWxsX2V4dGVuZHMgJiYgdGhpcy5kaWxsX2V4dGVuZHModGFyZ2V0LGRhdGEpO1xyXG5cclxuLy8gVGhpcyBzZXQgZm9yIGxhdGVyLiBJdCBuZWVkcyB0byBiZSBzZXQgaGVyZSBiZWNhdXNlIGluc2lkZSB0aGUgdGVtcGxhdGVfZm9yIGZ1bmN0aW9uIGl0IGlzIHJlbW92ZWQgZnJvbSB0aGUgZWxlbWVudC5cclxuLy8gVGhpcyBhdHRyaWJ1dGUgaXMgcmVtb3ZlZCBzbyB0aGF0IHRoZSByZW5kZXIgZnVuY3Rpb24gYW5kIHRlbXBsYXRlIGZ1bmN0aW9uIGRvIG5vdCBnZXQgc3R1Y2sgaW4gYSBsb29wLlxyXG5cdGhhc19mb3IgPSB0YXJnZXQuaGFzQXR0cmlidXRlKFwiZGlsbC1mb3JcIik7XHJcblxyXG4vLyBJZiB0aGUgZnVuY3Rpb24gZXhpc3RzIGhhbmRsZSB0aGUgZGlsbC1mb3IgYXR0cmlidXRlLlxyXG5cdHRoaXMudGVtcGxhdGVfZm9yICYmIHRoaXMudGVtcGxhdGVfZm9yKHRhcmdldCx0ZW1wbGF0ZSxvcHRpb25zKTtcclxuXHJcbi8vIFJ1biB0aHJvdWdoIGVhY2ggYXR0cmlidXRlXHJcblx0dGVtcGxhdGUuYXR0cmlidXRlcyA9IHRoaXMuY3JlYXRlX2F0dHJpYnV0ZXModGFyZ2V0LHRlbXBsYXRlLF9kYXRhKTtcclxuXHRcclxuLy8gSWYgdGhlIGF0dHJpYnV0ZSBkaWxsLWZvciBleGlzdHMgdGhlbiBkb24ndCBjb250aW51ZSwgdGhpcyB3aWxsIGJlIHBpY2tlZCBvbiB3aGVuZXZlciBhIG5ldyBlbGVtZW50IGluc2lkZSB0aGlzIHJlcGVhdCBpcyBhZGRlZCBhbmQgYSB0ZW1wbGF0ZSB3aXRoIHRoZSBjb3JyZWN0IGNvbnRleHQgaXMgZ2VuZXJhdGVkLlxyXG5cdGlmIChoYXNfZm9yKSB7XHJcblx0XHRyZXR1cm4gdGVtcGxhdGU7XHJcblx0fVxyXG5cclxuLy8gSWYgdGhlIGZ1bmN0aW9uIGV4aXN0cyBoYW5kbGUgdGhlIGRpbGwtaWYgYXR0cmlidXRlLlxyXG5cdHRoaXMudGVtcGxhdGVfaWYgJiYgdGhpcy50ZW1wbGF0ZV9pZih0YXJnZXQsdGVtcGxhdGUsb3B0aW9ucyk7XHJcblxyXG4vLyBJZiB0aGUgZnVuY3Rpb24gZXhpc3RzIGhhbmRsZSB0aGUgZGlsbC10ZW1wbGF0ZSBhdHRyaWJ1dGUuXHJcblx0dGhpcy5kaWxsX3RlbXBsYXRlICYmIHRoaXMuZGlsbF90ZW1wbGF0ZSh0YXJnZXQsdGVtcGxhdGUpO1xyXG5cclxuLy8gSWYgdGhpcyBlbGVtZW50IGlzIGFjdHVhbGx5IGEgY29tcG9uZW50IGl0IHdpbGwgYmUgZm91bmQgYW5kIGhhbmRsZWQgYXMgc3VjaCBmcm9tIGhlcmUuXHJcbi8vIElmIHRoZSBmdW5jdGlvbiBleGlzdHMgaGFuZGxlIHRoZSBjb21wb25lbnQgZnVuY3Rpb24uXHJcblx0dGhpcy50ZW1wbGF0ZV9jb21wb25lbnQgJiYgdGhpcy50ZW1wbGF0ZV9jb21wb25lbnQodGFyZ2V0LHRlbXBsYXRlKTtcclxuXHJcblx0KGZ1bmN0aW9uKCl7XHJcblx0XHR2YXIgdmFsdWUgPSB0ZW1wbGF0ZS5pZiAmJiB0ZW1wbGF0ZS5kYXRhW3RlbXBsYXRlLmlmLnZhbHVlXTtcclxuXHRcdGlmICghdGVtcGxhdGUuY29tcG9uZW50IHx8ICF0ZW1wbGF0ZS5kYXRhLmhhc093blByb3BlcnR5KFwib25pbml0XCIpKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdGlmICh0ZW1wbGF0ZS5pZiAmJiAhKFxyXG5cdFx0XHRcdHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXHJcblx0XHRcdFx0XHQ/IHZhbHVlKClcclxuXHRcdFx0XHRcdDogdmFsdWVcclxuXHRcdFx0XHQpKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuXHRcdFx0dGVtcGxhdGUuZGF0YS5vbmluaXQoKTtcclxuXHRcdH0sMCk7XHJcblx0fSgpKTtcclxuXHJcbi8vIEZvciBlYWNoIGNoaWxkIGVsZW1lbnQgY3JlYXRlIGEgbmV3IHRlbXBsYXRlIGJyYW5jaC5cclxuXHR0ZW1wbGF0ZS5jaGlsZHMgPSBBcnJheS5wcm90b3R5cGUubWFwLmFwcGx5KHRhcmdldC5jaGlsZE5vZGVzLFsoZnVuY3Rpb24oeCl7XHJcblx0XHRyZXR1cm4gdGhpcy5jcmVhdGVfdGVtcGxhdGUoeCx0ZW1wbGF0ZS5kYXRhLHRlbXBsYXRlLm1vZHVsZSxvcHRpb25zKTtcclxuXHR9KS5iaW5kKHRoaXMpXSk7XHJcblxyXG5cdHJldHVybiB0ZW1wbGF0ZTtcclxufVxyXG4iLCJcclxud2luZG93Ll9kaWxsLnJlbmRlcl9hdHRyaWJ1dGVzID0gZnVuY3Rpb24odGFyZ2V0LHRlbXBsYXRlKXtcclxuXHR0ZW1wbGF0ZS5hdHRyaWJ1dGVzICYmIHRlbXBsYXRlLmF0dHJpYnV0ZXMuZm9yRWFjaChmdW5jdGlvbih4KXtcclxuXHRcdHZhciB2YWx1ZSA9IHRoaXMuZXZhbHVhdG9yKHgudmFsdWUsdGVtcGxhdGUuZGF0YSk7XHJcblx0XHRpZiAoIXRlbXBsYXRlLmNvbXBvbmVudCAmJiB4Lm5hbWUgIT09IFwidmFsdWVcIikge1xyXG5cdFx0XHR0YXJnZXQuc2V0QXR0cmlidXRlKFxyXG5cdFx0XHRcdHgubmFtZSxcclxuXHRcdFx0XHR4LnR5cGUgPT09IFwibGl0ZXJhbFwiXHJcblx0XHRcdFx0XHQ/IHgudmFsdWVcclxuXHRcdFx0XHRcdDogeC50eXBlID09PSBcImJpbmRcIlxyXG5cdFx0XHRcdFx0XHQ/IHZhbHVlXHJcblx0XHRcdFx0XHRcdDogeC50eXBlID09PSBcImRlZmF1bHRcIlxyXG5cdFx0XHRcdFx0XHRcdD8gdGhpcy5icmFjZXIoeC52YWx1ZSx0ZW1wbGF0ZS5kYXRhKVxyXG5cdFx0XHRcdFx0XHRcdDogbnVsbFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHRhcmdldC52YWx1ZSA9IHZhbHVlO1xyXG5cdFx0fVxyXG5cdH0uYmluZCh0aGlzKSk7XHJcbn1cclxuIiwiXHJcbndpbmRvdy5fZGlsbC5yZW5kZXJfZWxlbWVudCA9IGZ1bmN0aW9uKHJlbmRlciwgY29uZGl0aW9uKXtcclxuXHJcblx0aWYgKCFyZW5kZXIgaW5zdGFuY2VvZiB0aGlzLlJlbmRlcikge1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0dmFyIHRhcmdldCA9IHJlbmRlci50YXJnZXQsXHJcblx0XHR0ZW1wbGF0ZSA9IHJlbmRlci50ZW1wbGF0ZSxcclxuXHRcdHBhcmVudF90ZW1wbGF0ZSA9IHJlbmRlci5wYXJlbnRfdGVtcGxhdGUsXHJcblx0XHRpZl92YWx1ZTtcclxuXHJcblx0Ly8gY29uc29sZS5sb2coXCJSZW5kZXI6IFwiLCByZW5kZXIuY29uZGl0aW9uLCByZW5kZXIsIGNvbmRpdGlvbik7XHJcblxyXG5cdGNvbmRpdGlvbiA9IHJlbmRlci5jb25kaXRpb24gPT09IHVuZGVmaW5lZCB8fCAocmVuZGVyLmNvbmRpdGlvbiBpbnN0YW5jZW9mIEVsZW1lbnRcclxuXHRcdD8gcmVuZGVyLmNvbmRpdGlvbiA9PT0gdGFyZ2V0XHJcblx0XHQ6IHJlbmRlci5jb25kaXRpb24gaW5zdGFuY2VvZiByZWYuQ29tcG9uZW50XHJcblx0XHRcdD8gcmVuZGVyLmNvbmRpdGlvbiA9PT0geC5jb21wb25lbnRcclxuXHRcdFx0OiBmYWxzZSk7XHJcblxyXG5cdGlmIChjb25kaXRpb24pIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiVGFyZ2V0OiBcIiwgdGFyZ2V0LCByZW5kZXIpO1xyXG5cdH1cclxuXHJcblx0aWYgKHRlbXBsYXRlLnR5cGUgPT09IFwiI2NvbW1lbnRcIiB8fCB0ZW1wbGF0ZS50eXBlID09PSBcIlNDUklQVFwiKSB7XHJcblx0XHRyZXR1cm4gMTtcclxuXHR9XHJcblxyXG5cdGlmICh0ZW1wbGF0ZS50eXBlID09PSBcIiN0ZXh0XCIpIHtcclxuXHRcdGlmIChjb25kaXRpb24pIHtcclxuXHRcdFx0dGFyZ2V0Lm5vZGVWYWx1ZSA9IHRoaXMuYnJhY2VyKHRlbXBsYXRlLnZhbHVlLHRlbXBsYXRlLmRhdGEpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIDE7XHJcblx0fVxyXG5cclxuXHRpZiAodGVtcGxhdGUuaGFzT3duUHJvcGVydHkoXCJmb3JcIikpIHtcclxuXHRcdHJldHVybiB0aGlzLnJlbmRlcl9mb3IocmVuZGVyLGNvbmRpdGlvbik7XHJcblx0fVxyXG5cclxuXHRpZiAoY29uZGl0aW9uKSB7XHJcblx0XHRpZiAodGVtcGxhdGUuaGFzT3duUHJvcGVydHkoXCJpZlwiKSkge1xyXG5cdFx0XHRpZl92YWx1ZSA9IHRoaXMucmVuZGVyX2lmKHRhcmdldCx0ZW1wbGF0ZSk7XHJcblx0XHRcdGlmIChpZl92YWx1ZSA9PT0gMCkge1xyXG5cdFx0XHRcdHJldHVybiAwO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRhcmdldCA9IGlmX3ZhbHVlO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHRlbXBsYXRlLnRlbXBsYXRlKSB7XHJcblx0XHRcdChmdW5jdGlvbigpe1xyXG5cdFx0XHRcdHZhciBfdGVtcGxhdGUgPSB0ZW1wbGF0ZS50ZW1wbGF0ZSxcclxuXHRcdFx0XHRcdGF0dHJpYnV0ZXMgPSB0ZW1wbGF0ZS5hdHRyaWJ1dGVzO1xyXG5cdFx0XHRcdHRhcmdldC5pbm5lckhUTUwgPSB0eXBlb2YgX3RlbXBsYXRlID09PSBcImZ1bmN0aW9uXCJcclxuXHRcdFx0XHRcdD8gX3RlbXBsYXRlLmFwcGx5KHRlbXBsYXRlLmRhdGEpXHJcblx0XHRcdFx0XHQ6IF90ZW1wbGF0ZTtcclxuXHRcdFx0XHR0ZW1wbGF0ZSA9IHRoaXMuY3JlYXRlX3RlbXBsYXRlKHRhcmdldCx0ZW1wbGF0ZS5kYXRhLHRlbXBsYXRlLm1vZHVsZSk7XHJcblx0XHRcdC8vIFJlY3JlYXRpbmcgdGhlIHRlbXBsYXRlIHdpbGwgZ2VuZXJhdGUgdGhlIHdyb25nIGF0dHJpYnV0ZXMgQXJyYXkuIFdlIHNhdmUgaXQgZnJvbSBpdHMgb3JpZ2luYWwgYW5kIHBsYWNlIGl0IGJhY2sgaW4gaGVyZTpcclxuXHRcdFx0XHR0ZW1wbGF0ZS5hdHRyaWJ1dGVzID0gYXR0cmlidXRlcztcclxuXHRcdFx0XHR0aGlzLnJlbmRlcl9lbGVtZW50KG5ldyByZWYuUmVuZGVyKHRhcmdldCx0ZW1wbGF0ZSkpO1xyXG5cdFx0XHRcdHRlbXBsYXRlLnRlbXBsYXRlID0gX3RlbXBsYXRlO1xyXG5cdFx0XHR9LmFwcGx5KHRoaXMpKTtcclxuXHRcdH1cclxuXHRcdHRoaXMucmVuZGVyX2F0dHJpYnV0ZXModGFyZ2V0LHRlbXBsYXRlKTtcclxuXHR9XHJcblxyXG5cdChmdW5jdGlvbigpe1xyXG5cdFx0dmFyIGluZGV4ID0gMDtcclxuXHJcblx0XHR0ZW1wbGF0ZS5jaGlsZHMgJiYgdGVtcGxhdGUuY2hpbGRzLmZvckVhY2goKGZ1bmN0aW9uKHgsaSl7XHJcblxyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIlBhcmVudCB0YXJnZXQ6IFwiLCB0YXJnZXQsIHRhcmdldC5jaGlsZE5vZGVzW2luZGV4XSk7XHJcblxyXG5cdFx0XHRpZiAodGFyZ2V0LmNoaWxkTm9kZXNbaW5kZXhdID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIkNvbmRpdGlvbjogXCIsIHRhcmdldC5jaGlsZE5vZGVzW2luZGV4XSwgcmVuZGVyLmNvbmRpdGlvbiwgY29uZGl0aW9uKTtcclxuXHJcblx0XHRcdGluZGV4ICs9IHRoaXMucmVuZGVyX2VsZW1lbnQoXHJcblx0XHRcdFx0ZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRcdHZhciBuZXdfcmVuZGVyID0gbmV3IHRoaXMuUmVuZGVyKHRhcmdldC5jaGlsZE5vZGVzW2luZGV4XSx4LHRlbXBsYXRlKTtcclxuXHRcdFx0XHRcdG5ld19yZW5kZXIuY29uZGl0aW9uID0gcmVuZGVyLmNvbmRpdGlvbjtcclxuXHRcdFx0XHRcdHJldHVybiBuZXdfcmVuZGVyO1xyXG5cdFx0XHRcdH0uYXBwbHkodGhpcyksXHJcblx0XHRcdFx0Y29uZGl0aW9uXHJcblx0XHRcdCk7XHJcblx0XHR9KS5iaW5kKHRoaXMpKTtcclxuXHJcblx0fS5hcHBseSh0aGlzKSk7XHJcblxyXG5cdHJldHVybiAxO1xyXG59XHJcbiIsIlxyXG4vLyBMaXN0IG9mIHJlbmRlcnMgKFRlbXBsYXRlcyBhbmQgZWxlbWVudCB0YXJnZXRzKS5cclxudmFyIHJlbmRlcnMgPSBbXSxcclxuLy8gR3JhYiBhIHJlZmVyZW5jZSB0byB0aGUgcHJpdmF0ZSBkaWxsIG1ldGhvZHMgYmVmb3JlIHRoZXkgYXJlIGRlbGV0ZWQgZnJvbSB0aGUgd2luZG93IG9iamVjdCBhbmQgZ2FyYmFnZSBjb2xsZWN0ZWQuXHJcblx0cmVmID0gd2luZG93Ll9kaWxsLFxyXG5cdERpbGwgPSBmdW5jdGlvbigpe1xyXG5cdFx0dmFyIG1vZHVsZXMgPSB7fTtcclxuXHRcdHRoaXMubW9kdWxlID0gZnVuY3Rpb24obmFtZSxleHRlbnNpb25zKXtcclxuXHRcdFx0aWYgKHR5cGVvZiBuYW1lICE9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0dGhyb3coXCJZb3UgbXVzdCBwYXNzIGEgbmFtZSB3aGVuIGNyZWF0aW5nIGEgbW9kdWxlLlwiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAobW9kdWxlc1tuYW1lXSkge1xyXG5cdFx0XHRcdHJldHVybiBtb2R1bGVzW25hbWVdO1xyXG5cdFx0XHR9XHJcblx0XHRcdG1vZHVsZXNbbmFtZV0gPSByZWYuY3JlYXRlX21vZHVsZShcclxuXHRcdFx0XHRuYW1lLFxyXG5cdFx0XHRcdGV4dGVuc2lvbnMgPT09IHVuZGVmaW5lZFxyXG5cdFx0XHRcdFx0PyBbXVxyXG5cdFx0XHRcdFx0OiBleHRlbnNpb25zXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybiBtb2R1bGVzW25hbWVdO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5nZXRfbW9kdWxlID0gZnVuY3Rpb24obmFtZSl7XHJcblx0XHRcdHJldHVybiBtb2R1bGVzW25hbWVdO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5yZW5kZXIgPSBmdW5jdGlvbih0YXJnZXQsaW5pdGlhbF9kYXRhLG1vZHVsZSl7XHJcblx0XHRcdHZhciB0ZW1wbGF0ZSxcclxuXHRcdFx0XHRyZW5kZXI7XHJcblx0XHRcdGlmICh0eXBlb2YgaW5pdGlhbF9kYXRhICE9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHR0aHJvdyhcIkRhdGEgcGFzc2VkIGludG8gdGhlIHJlbmRlciBmdW5jdGlvbiBtdXN0IGJlIGEgY29uc3RydWN0b3IgZnVuY3Rpb24uXCIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGluaXRpYWxfZGF0YSA9IG5ldyBpbml0aWFsX2RhdGEoKTtcclxuXHRcdFx0aW5pdGlhbF9kYXRhID0gcmVmLmNyZWF0ZV9kYXRhX29iamVjdCh7dGVtcGxhdGVfb2JqZWN0OmluaXRpYWxfZGF0YX0pO1xyXG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0aW5pdGlhbF9kYXRhLm9uaW5pdCAmJiBpbml0aWFsX2RhdGEub25pbml0KCk7XHJcblx0XHRcdH0sMCk7XHJcblx0XHRcdHRlbXBsYXRlID0gcmVmLmNyZWF0ZV90ZW1wbGF0ZSh0YXJnZXQsaW5pdGlhbF9kYXRhLG1vZHVsZSk7XHJcblx0XHRcdHJlbmRlciA9IG5ldyByZWYuUmVuZGVyKHRhcmdldCx0ZW1wbGF0ZSk7XHJcblx0XHRcdHJlbmRlcnMucHVzaChyZW5kZXIpO1xyXG5cdFx0XHRyZWYucmVuZGVyX2VsZW1lbnQocmVuZGVyLHRydWUpO1xyXG5cdFx0XHRyZXR1cm4gdGVtcGxhdGUuZGF0YTtcclxuXHRcdH1cclxuXHRcdHRoaXMuY2hhbmdlID0gZnVuY3Rpb24oY29uZGl0aW9uKXtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJDaGFuZ2U6IFwiLCBjb25kaXRpb24pO1xyXG5cdFx0XHRyZW5kZXJzLmZvckVhY2goZnVuY3Rpb24oeCl7XHJcblx0XHRcdFx0eC5jb25kaXRpb24gPSBjb25kaXRpb247XHJcblx0XHRcdFx0cmVmLnJlbmRlcl9lbGVtZW50KHgsIWNvbmRpdGlvbik7XHJcblx0XHRcdH0uYmluZCh0aGlzKSk7XHJcblx0XHR9XHJcblx0XHR0aGlzLnJlc2V0ID0gZnVuY3Rpb24oKXtcclxuXHRcdFx0cmVuZGVycyA9IFtdO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5jb21wb25lbnQgPSB3aW5kb3cuX2RpbGwuZ2VuZXJhdGVfY29tcG9uZW50O1xyXG5cdFx0dGhpcy5zZXJ2aWNlID0gd2luZG93Ll9kaWxsLmdlbmVyYXRlX3NlcnZpY2U7XHJcblx0fTtcclxud2luZG93LmRpbGwgPSBuZXcgRGlsbCgpO1xyXG5kZWxldGUgd2luZG93Ll9kaWxsO1xyXG4iXX0=
