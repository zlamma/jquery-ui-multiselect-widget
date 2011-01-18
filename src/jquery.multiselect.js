/*
 * jQuery MultiSelect UI Widget 1.8
 * Copyright (c) 2010 Eric Hynds
 *
 * http://www.erichynds.com/jquery/jquery-ui-multiselect-widget/
 *
 * Depends:
 *   - jQuery 1.4.2+
 *   - jQuery UI 1.8 widget factory
 *
 * Optional:
 *   - jQuery UI effects
 *   - jQuery UI position utility
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
*/
(function($, undefined){

var multiselectID = 0;

$.widget("ech.multiselect", {
	
	// default options
	options: {
		header: true,
		height: 175,
		minWidth: 225,
		classes: '',
		checkAllText: 'Check all',
		uncheckAllText: 'Uncheck all',
		noneSelectedText: 'Select options',
		selectedText: '# selected',
		selectedList: 0,
		show: '',
		hide: '',
		autoOpen: false,
		multiple: true,
		position: {},
		// Use native click() on widget's inputs for best results. If you want jQuery
		// watch if this got fixed - this is reported as a jQuery bug: http://bugs.jquery.com/ticket/3827
		dontFixJqueryClick: false
	},

	// unique ID for the option tags and their <label for="">. assigned on create
	id: undefined,

	_create: function(){
		var el = this.element.hide(),
			o = this.options,
			self = this;

		this.id = el.attr('id') || multiselectID++;
		
		this.speed = $.fx.speeds._default; // default speed for effects
		this._isOpen = false; // assume no
	
		var 
			button = (this.button = $('<button type="button"><span class="ui-icon ui-icon-triangle-2-n-s"></span></button>'))
				.addClass('ui-multiselect ui-widget ui-state-default ui-corner-all')
				.addClass( o.classes )
				.attr({ 'title':el.attr('title'), 'aria-haspopup':true })
				.insertAfter( el ),
			
			buttonlabel = (this.buttonlabel = $('<span />'))
				.html( o.noneSelectedText )
				.appendTo( button ),
				
			menu = (this.menu = $('<div />'))
				.addClass('ui-multiselect-menu ui-widget ui-widget-content ui-corner-all')
				.addClass( o.classes )
				.insertAfter( button ),
				
			header = (this.header = $('<div />'))
				.addClass('ui-widget-header ui-corner-all ui-multiselect-header ui-helper-clearfix')
				.appendTo( menu ),
				
			headerLinkContainer = (this.headerLinkContainer = $('<ul />'))
				.addClass('ui-helper-reset')
				.html(function(){
					if( o.header === true ){
						return '<li><a class="ui-multiselect-all" href="#"><span class="ui-icon ui-icon-check"></span><span>' + o.checkAllText + '</span></a></li><li><a class="ui-multiselect-none" href="#"><span class="ui-icon ui-icon-closethick"></span><span>' + o.uncheckAllText + '</span></a></li>';
					} else if(typeof o.header === "string"){
						return '<li>' + o.header + '</li>';
					} else {
						return '';
					}
				})
				.append('<li class="ui-multiselect-close"><a href="#" class="ui-multiselect-close"><span class="ui-icon ui-icon-circle-close"></span></a></li>')
				.appendTo( header ),
			
			checkboxContainer = (this.checkboxContainer = $('<ul />'))
				.addClass('ui-multiselect-checkboxes ui-helper-reset')
				.appendTo( menu );
		
		// perform event bindings
		this._bindEvents();

		this._bindEventsOfOriginal();

		// build menu
		this.refresh( true );
		
		// some addl. logic for single selects
		if( !o.multiple ){
			menu.addClass('ui-multiselect-single');
		}
	},

	_init: function(){
		if( this.options.header === false ){
			this.header.hide();
		}
		if( !this.options.multiple ){
			this.headerLinkContainer.find('.ui-multiselect-all, .ui-multiselect-none').hide();
		}
		if( this.options.autoOpen ){
			this.open();
		}
		if( this.element.is(':disabled') ){
			this.disable();
		}
	},
	
	refresh: function( init ){
		var self = this,
			el = this.element,
			o = this.options,
			menu = this.menu,
			button = this.button,
			checkboxContainer = this.checkboxContainer,
			optgroups = [];

		this._optionInputIdSeq = 0;
		checkboxContainer.empty();
		
		// build items
		this.element.find('option').each(function(i){
			var $this = $(this),
				$parent = $this.parent(),
				widgetOption;
			
			// is this an optgroup?
			if( $parent.is('optgroup') ){
				var optLabel = $parent.attr('label');
				
				// has this optgroup been added already?
				if( $.inArray(optLabel, optgroups) === -1 ){
					$('<li class="ui-multiselect-optgroup-label"><a href="#">' + optLabel + '</a></li>')
						.appendTo( checkboxContainer );
					
					optgroups.push( optLabel );
				}
			}
			widgetOption = $('<li class="ui-multiselect-widgetOption" />')
				.appendTo(checkboxContainer);
			widgetOption.data('original-option', $this);
			$this.data('ui-multiselect-widget', widgetOption);
			self._refreshWidgetOption(widgetOption);
		});
		
		// cache some moar useful elements
		this.labels = menu.find('label');
		
		// set widths
		this._setButtonWidth();
		this._setMenuWidth();
		
		// remember default value
		button[0].defaultValue = this._updateButton();
		
		// broadcast refresh event; useful for widgets
		if( !init ){
			this._trigger('refresh');
		}
	},
	
	// updates the selections and the button text based on original select. Use refresh() to rebuild when options were added or removed
	update: function(){
		this._updateSelectionChanges();
	},
	
	_updateSelectionChanges: function () {
 		var self = this;
		// Prepare the list first, instead of refreshing selection in  each(), because in single select our radio auto change will forfeit the information on what was originally selected
		var selectionDifferences = self.menu.find('.ui-multiselect-widgetOption').filter(function(){
			var $this = $(this);
			return $this.data('original-option')[0].selected !== $this.find('.ui-multiselect-option-input').is(':checked');
		});
		selectionDifferences.each(function () {
			self._refreshWidgetOptionSelection($(this));
		});
		this._updateButton();
	},

	_updateAllOptions: function () {
 		var self = this;
		self.menu.find('.ui-multiselect-widgetOption').each(function(){
			self._refreshWidgetOption($(this));
		});
		this._updateButton();
	},
	
	_updateAllOptionsSelections: function () {
 		var self = this;
		self.menu.find('.ui-multiselect-widgetOption').each(function(){
			self._refreshWidgetOptionSelection($(this));
		});
		this._updateButton();
	},
	
	_updateButton: function(getIsOrigOptionSelected){
		if (getIsOrigOptionSelected === undefined)
			getIsOrigOptionSelected = function(){
				return this.selected; };
		var o = this.options,
			$options = this.element.find('option').filter(function() { return $(this).css('visibility') !== 'hidden' && $(this).css('display') !== 'none' }),
			$selected = $options.filter(getIsOrigOptionSelected),
			numSelected = $selected.length,
			value;
		
		if( numSelected === 0 ){
			value = o.noneSelectedText;
		} else {
			if($.isFunction(o.selectedText)){
				value = o.selectedText.call(this, numSelected, $options.length, $selected.map(function(){return $(this).data('ui-multiselect-widget').find('.ui-multiselect-option-input')[0]; }).get());
			} else if( /\d/.test(o.selectedList) && o.selectedList > 0 && numSelected <= o.selectedList){
				value = $selected.map(function(){return $(this).data('ui-multiselect-widget').find('.ui-multiselect-option-visual').html(); }).get().join(', ');
			} else {
				value = o.selectedText.replace('#', numSelected).replace('#', $options.length);
			}
		}
		
		this.buttonlabel.html( value );
		return value;
	},

	// unique input Ids are needed for <label for="">. Assigned in refresh()
	_optionInputIdSeq: undefined,

	_refreshWidgetOption: function (widgetOption) {
		var o = this.options,
			originalOption = widgetOption.data('original-option'),
			isDisabled = originalOption.is(':disabled'),
			label = widgetOption.find('.ui-multiselect-option-label').first(),
			input = widgetOption.find('.ui-multiselect-option-input').first(),
			visual = widgetOption.find('.ui-multiselect-option-visual').first();

		if (label.length === 0) {
			var inputID = originalOption[0].id || 'ui-multiselect-' + this.id + '-option-' + this._optionInputIdSeq++;
			label = $('<label class="ui-multiselect-option-label ui-corner-all" for="' + inputID + '" />')
				.appendTo(widgetOption);
			input = $('<input class="ui-multiselect-option-input" type="' + (o.multiple ? 'checkbox' : 'radio') + '" id="' + inputID + '" '+(originalOption[0].selected ? 'checked="checked"' : '')+ ' name="multiselect_' + this.id + '" />')
				.appendTo(label);
			visual = $('<span class="ui-multiselect-option-visual"/>')
				.appendTo(label);
		}
		
		this._refreshWidgetOptionSelection(widgetOption);

		widgetOption
			.toggleClass('ui-multiselect-disabled', isDisabled)
			.addClass(originalOption.attr('class'))
			.attr({ title: originalOption.attr('title'), style: originalOption.attr('style') });

		label.toggleClass('ui-state-disabled', isDisabled);

		input.attr({ disabled: isDisabled, 'aria-disabled': isDisabled })
			.val(originalOption.val());

		visual.html(originalOption.html());
	},

	// Refreshes the widget's option selection only (based on the original selection)
	// widgetOption - the widget element representing the original option
	// isSelected *optional* - whether the option should be selected
	_refreshWidgetOptionSelection: function (widgetOption, isSelected) {
		if (isSelected === undefined)
			isSelected = widgetOption.data('original-option')[0].selected;
		widgetOption.find('.ui-multiselect-option-input').first()[0].checked = isSelected;
		this._refreshWidgetOptionSelectionAppearance(widgetOption, isSelected);
	},
	
	
	// Refreshes the widget's option selection appearance only (based the specified isSelected flag)
	// This is for uses in click event trigger where we don't want to update the checkbox checked flag because
	// it was already updated or will be updated to !checked, so by doing it here we would cause the click
	// to have no effect
	// widgetOption - the widget element representing the original option
	// isSelected - whether the option should be selected
	_refreshWidgetOptionSelectionAppearance: function (widgetOption, isSelected) {
			
		var label = widgetOption.find('.ui-multiselect-option-label').first(),
			input = widgetOption.find('.ui-multiselect-option-input').first();
	
		label.toggleClass('ui-state-active', isSelected && !this.options.multiple);
		input.attr({ 'aria-selected': isSelected });
	},

	// We need to keep these so we can unbind them on destroy.
	// They are assigned on create because they should be unique per widget, so we can unbind precisely them.
	// Also thanks to that they can be closures and can set the widget for 'this' in the actual handling code
	_originalSelectChangeEventHandler: undefined,
	_originalSelectRefreshEventHandler: undefined,
	_originalOptionRefreshEventHandler: undefined,
	_formResetEventHandler: undefined,
	
	// Binds to the events of the original select
	_bindEventsOfOriginal: function () {
		var self = this,
			el = this.element;
		
		// deal with form resets.  the problem here is that buttons aren't
		// restored to their defaultValue prop on form reset, and the reset
		// handler fires before the form is actually reset so we use defaultselected
		$(this.element[0].form).bind('reset', this._formResetEventHandler = function(e){
			self.menu.find('.ui-multiselect-widgetOption').each(function(){
				var originalOption = $(this).data('original-option')[0];
				self._refreshWidgetOptionSelection($(this), originalOption.defaultSelected);
			});
			self._updateButton(function() {
				return this.defaultSelected; } );
		});

		// Support selecting using the original element
		el.bind('change', this._originalSelectChangeEventHandler = function (e) {
			self._handleOriginalChange(e);
		});
		// The original select can trigger a rebuild using 'refresh' event
		el.bind('refresh', this._originalSelectRefreshEventHandler = function (e) {
			if (e.target === el[0])
				self.refresh(false);
		});
		// The original options can trigger the rebuild of its <li> using 'refresh'
		el.delegate('option', 'refresh', this._originalOptionRefreshEventHandler = function (e) {
			if (e.target.parentNode === el[0])
				self._refreshWidgetOption($(e.target).data('ui-multiselect-widget'));
		});
	},

	// Unbinds from the events of the original select
	_unbindEventsOfOriginal: function () {
		$(this.element[0].form).unbind('reset', this._formResetEventHandler);
		this.element.unbind("change", this._originalSelectChangeEventHandler);
		this.element.unbind("refresh", this._originalSelectRefreshEventHandler);
		this.element.undelegate('option', 'refresh', this._originalOptionRefreshEventHandler);
	},

	// binds events of widget's elements
	_bindEvents: function(){
		var self = this, button = this.button;
		
		function clickHandler(){
			self[ self._isOpen ? 'close' : 'open' ]();
			return false;
		}
		
		// webkit doesn't like it when you click on the span :(
		button.find('span').bind('click.multiselect', clickHandler);
		
		// button events
		button.bind({
			click: clickHandler,
			keypress: function(e){
				switch(e.which){
					case 27: // esc
					case 38: // up
					case 37: // left
						self.close();
						break;
					case 39: // right
					case 40: // down
						self.open();
						break;
				}
			},
			mouseenter: function(){
				if( !button.hasClass('ui-state-disabled') ){
					$(this).addClass('ui-state-hover');
				}
			},
			mouseleave: function(){
				$(this).removeClass('ui-state-hover');
			},
			focus: function(){
				if( !button.hasClass('ui-state-disabled') ){
					$(this).addClass('ui-state-focus');
				}
			},
			blur: function(){
				$(this).removeClass('ui-state-focus');
			}
		});

		// header links
		this.header
			.delegate('a', 'click.multiselect', function(e){
				// close link
				if( $(this).hasClass('ui-multiselect-close') ){
					self.close();
			
				// check all / uncheck all
				} else {
					self[ $(this).hasClass('ui-multiselect-all') ? 'checkAll' : 'uncheckAll' ]();
				}
			
				e.preventDefault();
			});
		
		// optgroup label toggle support
		this.menu
			.delegate('li.ui-multiselect-optgroup-label a', 'click.multiselect', function(e){
				var $this = $(this),
					$inputs = $this.parent().nextUntil('li.ui-multiselect-optgroup-label').find('input:visible:not(:disabled)');
				
				// toggle inputs
				self._toggleChecked( $inputs.filter(':checked').length !== $inputs.length, $inputs );
				
				// trigger event
				self._trigger('optgrouptoggle', e, {
					inputs: $inputs.get(),
					label: $this.parent().text(),
					checked: $inputs[0].checked
				});
				
				e.preventDefault();
			})
			.delegate('label', 'mouseenter', function(){
				var input = $(this).find('input');
				// IE will throw an error if we try to focus on a disabled input -- http://api.jquery.com/focus/
				if (input.is(':enabled')) {
					// Use native focus so we get all associated events: [focus, focusIn] in newly focused and [blur, focusOut] in the previously focused input
					input[0].focus();
				}
			})
			// In Chrome clicking on the label will put its input out of focus for good, so we should restore it
			.delegate('label', 'click', function(e){
				var input = $(this).find('input');
				if (input.is(':enabled')) {
					// Keep IE happy on tests - don't call native focus on invisible inputs
					if (input.is(':visible'))
						input[0].focus();
					else
						input.trigger('focusin').trigger('focus');
				}
			})
			.delegate('input', 'focusin', function(){
				$(this).closest('.ui-multiselect-widgetOption').find('.ui-multiselect-option-label').addClass('ui-state-hover');
			});
		// We need this to prevent a momentary change in appearance when a label is being clicked at and input loses focus
		// Tried to prevent that momentary focus loss on mousedown but Opera blinks
		var clickingOnLabelSoKeepVisuallySelected = false;
		this.menu
			.delegate('label', 'mousedown', function(e){ clickingOnLabelSoKeepVisuallySelected = true; })
			.delegate('label', 'mouseup', function(e){ clickingOnLabelSoKeepVisuallySelected = false; })
			.delegate('input', 'focusout', function(e){
				var label = $(this).closest('.ui-multiselect-widgetOption').find('.ui-multiselect-option-label');
				if (!clickingOnLabelSoKeepVisuallySelected)
					label.removeClass('ui-state-hover');
			})
			.delegate('label', 'keydown', function(e){
				switch(e.which){
					case 9: // tab
					case 27: // esc
						self.close();
						break;
					case 38: // up
					case 40: // down
					case 37: // left
					case 39: // right
						self._traverse(e.which, this);
						e.preventDefault();
						break;
					case 13: // enter
						e.preventDefault();
						// Use native click() to have the input already selected in the handler - this is reported as a jQuery bug: http://bugs.jquery.com/ticket/3827
						$(this).find('input')[0].click();
						break;
				}
			})
			.delegate('input[type="checkbox"], input[type="radio"]', 'click', function(e){

				var $this = $(this),
					thisWidgetOption = $this.closest('.ui-multiselect-widgetOption'),
					val = this.value,
					checked = this.checked;

				// If event was triggerred by jQuery, it won't have the option selected yet - jQuery issue http://bugs.jquery.com/ticket/3827
				// The jQuery bug is closed as wontfix, so we can rely on fact that the change related to the click is yet to happen. We can deduce the change ourselves then.
				if (!self.options.dontFixJqueryClick && (e instanceof jQuery.Event) && !('originalEvent' in e) && !($(this).attr('type') === 'radio' && this.checked))
					checked = !checked;
					
				// bail if this input is disabled or the event is cancelled
				if( $this.is(':disabled') || self._trigger('click', e, { value:val, text:this.title, checked:checked }) === false ){
					e.preventDefault();
					return;
				}
				
				// In a single select, we also need to update the unselected option. We didn't save which it was so we do an _updateAllOptionsSelections()
				// which refreshes the widget's option where selection differs
				if( !self.options.multiple ){
					// Unless the user clicked on a selected option. Nothing changes in such case
					if (thisWidgetOption.data('original-option')[0].selected)
						return;
					// Just set the value of the original <select> tag
					self.element.val($this.val());
					self._updateAllOptionsSelections();
				}
				// In a multi select - the only option affected is the one clicked
				else {
					thisWidgetOption.data('original-option')[0].selected = checked;
					self._refreshWidgetOptionSelectionAppearance(thisWidgetOption, checked);
					self._updateButton();
				}
				self._fireChangeInOriginal();
			});
		
		// close each widget when clicking on any other element/anywhere else on the page
		$(document).bind('click.multiselect', function(e){
			var $target = $(e.target);
			
			if(self._isOpen && !$.contains(self.menu[0], e.target) && !$target.is('button.ui-multiselect')){
				self.close();
			}
		});
	},

	_fireChangeInOriginal: function () {
		// Set relatedTarget on the event to mark that we should specifically ignore it
		this.element.trigger({
			type: "change",
			relatedTarget: this.menu[0]
		});
	},

	_handleOriginalChange: function (e) {
		if (this.menu[0] !== e.relatedTarget)
			this._updateSelectionChanges();
	},

	// set button width
	_setButtonWidth: function(){
		var width = this.element.outerWidth(),
			o = this.options;
			
		if( /\d/.test(o.minWidth) && width < o.minWidth){
			width = o.minWidth;
		}
		
		// set widths
		this.button.width( width );
	},
	
	// set menu width
	_setMenuWidth: function(){
		var m = this.menu,
			width = this.button.outerWidth()-
				parseInt(m.css('padding-left'),10)-
				parseInt(m.css('padding-right'),10)-
				parseInt(m.css('border-right-width'),10)-
				parseInt(m.css('border-left-width'),10);
				
		m.width( width || this.button.outerWidth() );
	},
	
	// move up or down within the menu
	_traverse: function(which, start){
		var $start = $(start),
			moveToLast = which === 38 || which === 37,
			
			// select the first li that isn't an optgroup label / disabled
			$next = $start.parent()[moveToLast ? 'prevAll' : 'nextAll']('li:not(.ui-multiselect-disabled, .ui-multiselect-optgroup-label)')[ moveToLast ? 'last' : 'first']();

		// Use native focus so we get all associated events: [focus, focusIn] in newly focused and [blur, focusOut] in the previously focused input

		// if at the first/last element
		if( !$next.length ){
			// move to the first/last
			this.menu.find('.ui-multiselect-option-input')[ moveToLast ? 'last' : 'first' ]()[0].focus();
		} else {
			$next.find('.ui-multiselect-option-input')[0].focus();
		}
	},

	_toggleChecked: function(flag, group){
		var $inputs = (group && group.length) ?
			group :
			this.labels.find('input'),
			self = this;
		
		var values = $inputs.map(function(){
			return this.value;
		}).get();
		
		var somethingChanged = false;

		// toggle state on original option tags and then refresh widget option
		$inputs.filter(function(){
			return !this.disabled && flag !== this.checked;
		}).each(function () {
			somethingChanged = true;
			var widgetOption = $(this).closest('.ui-multiselect-widgetOption');
			widgetOption.data('original-option')[0].selected = flag;
			self._refreshWidgetOptionSelection(widgetOption);
		});

		if (somethingChanged){
			// Refresh button
			this._updateButton();
			this._fireChangeInOriginal();
		}
	},

	_toggleDisabled: function( flag ){
		this.button
			.attr({ 'disabled':flag, 'aria-disabled':flag })[ flag ? 'addClass' : 'removeClass' ]('ui-state-disabled');
		
		this.menu
			.find('input')
			.attr({ 'disabled':flag, 'aria-disabled':flag })
			.parent()[ flag ? 'addClass' : 'removeClass' ]('ui-state-disabled');
		
		this.element
			.attr({ 'disabled':flag, 'aria-disabled':flag });
	},
	
	// open the menu
	open: function(e){
		var self = this,
			button = this.button,
			menu = this.menu,
			speed = this.speed,
			o = this.options;
	
		// bail if the multiselectopen event returns false, this widget is disabled, or is already open 
		if( this._trigger('beforeopen') === false || button.hasClass('ui-state-disabled') || this._isOpen ){
			return;
		}
		
		// close other instances
		$(':ech-multiselect').not(this.element).each(function(){
			var $this = $(this);
			
			if( $this.multiselect('isOpen') ){
				$this.multiselect('close');
			}
		});

		var elementToFocus;
		if (!o.multiple)
			elementToFocus = menu.find(':checked').first();
		if (o.multiple || elementToFocus.length === 0)
			// select the first option
			elementToFocus = this.labels.eq(0).find(':enabled.ui-multiselect-option-input').first();
		
		
		var $container = menu.find('ul:last'),
			effect = o.show,
			pos = button.position();
		
		// figure out opening effects/speeds
		if( $.isArray(o.show) ){
			effect = o.show[0];
			speed = o.show[1] || self.speed;
		}
		
		// set the scroll of the checkbox container
		$container.height(o.height);
		if (elementToFocus.length === 0)
			$container.scrollTop(0);
		
		// position and show menu
		if( $.ui.position && !$.isEmptyObject(o.position) ){
			o.position.of = o.position.of || button;
			
			menu
				.show()
				.position( o.position )
				.hide()
				.show( effect, speed );
		
		// if position utility is not available...
		} else {
			menu.css({ 
				top: pos.top+button.outerHeight(),
				left: pos.left
			}).show( effect, speed );
		}

		if (elementToFocus.length > 0) {
			// Use native focus so we get all associated events: [focus, focusIn] in newly focused and [blur, focusOut] in the previously focused input
			elementToFocus[0].focus();
		}

		button.addClass('ui-state-active');
		this._isOpen = true;
		this._trigger('open');
	},
	
	// close the menu
	close: function(){
		if(this._trigger('beforeclose') === false){
			return;
		}
	
		var o = this.options, effect = o.hide, speed = this.speed;
		
		// figure out opening effects/speeds
		if( $.isArray(o.hide) ){
			effect = o.hide[0];
			speed = o.hide[1] || this.speed;
		}
	
		this.menu.hide(effect, speed);
		this.button.removeClass('ui-state-active').trigger('blur').trigger('mouseleave');
		this._trigger('close');
		this._isOpen = false;
	},

	enable: function(){
		this._toggleDisabled(false);
	},
	
	disable: function(){
		this._toggleDisabled(true);
	},
	
	checkAll: function(e){
		this._toggleChecked(true);
		this._trigger('checkAll');
	},
	
	uncheckAll: function(){
		this._toggleChecked(false);
		this._trigger('uncheckAll');
	},
	
	getChecked: function(){
		return this.menu.find('input').filter(':checked');
	},
	
	destroy: function(){
		// remove classes + data
		$.Widget.prototype.destroy.call( this );

		this._unbindEventsOfOriginal();
		
		this.element.find('option').each(function(){
			$(this).removeData('ui-multiselect-widget');
		});
		
		this.button.remove();
		this.menu.remove();
		this.element.show();
		
		return this;
	},
	
	isOpen: function(){
		return this._isOpen;
	},
	
	widget: function(){
		return this.menu;
	},
	
	// react to option changes after initialization
	_setOption: function( key, value ){
		var menu = this.menu;
		
		switch(key){
			case 'header':
				menu.find('div.ui-multiselect-header')[ value ? 'show' : 'hide' ]();
				break;
			case 'checkAllText':
				menu.find('a.ui-multiselect-all span').eq(-1).text(value);
				break;
			case 'uncheckAllText':
				menu.find('a.ui-multiselect-none span').eq(-1).text(value);
				break;
			case 'height':
				menu.find('ul:last').height( parseInt(value,10) );
				break;
			case 'minWidth':
				this.options[ key ] = parseInt(value,10);
				this._setButtonWidth();
				this._setMenuWidth();
				break;
			case 'selectedText':
			case 'selectedList':
			case 'noneSelectedText':
				this.options[key] = value; // these all need to update immediately for the _updateButton() call
				this._updateButton();
				break;
			case 'classes':
				menu.add(this.button).removeClass(this.options.classes).addClass(value);
				break;
		}
		
		$.Widget.prototype._setOption.apply( this, arguments );
	}
});

})(jQuery);
