
"use strict";

(function(){

	const place_mine = function(grid){
		let position = Math.floor(Math.random() * this.sizeX * this.sizeY);
		if (grid[position] === 0) {
			grid[position] = 9;
		}
		else {
			place_mine.apply(this,[grid]);
		}
	};

	const get_locations_arround_index = function(index){
		const arr = [
			(index >= this.sizeX && index % this.sizeX !== 0) ? -1 - this.sizeX : null,
			(index >= this.sizeX) ? -this.sizeX : null,
			(index >= this.sizeX && index % this.sizeX !== (this.sizeX - 1)) ? 1 - this.sizeX : null,
			index % this.sizeX !== 0 ? -1 : null,
			index % this.sizeX !== (this.sizeX - 1) ? 1 : null,
			(index < this.sizeX * this.sizeY - this.sizeX && index % this.sizeX !== 0) ? -1 + this.sizeX : null,
			(index < this.sizeX * this.sizeY - this.sizeX) ? this.sizeX : null,
			(index < this.sizeX * this.sizeY - this.sizeX && index % this.sizeX !== (this.sizeX - 1)) ? 1 + this.sizeX : null
		];
		return arr;
	};

	const write_number = function(grid,index){
		if (grid[index] === 9) {
			return;
		}
		let output = 0;
		const arr = get_locations_arround_index.apply(this,[index]);
		arr.forEach(x => {
			output += grid[index+x] === 9;
		});
		grid[index] = output === 0
			? " "
			: output;
	};



	const Minesweeper = function(){

		this.grid = [];	
		this.is_finished = false;
		this.game_over = false;

		this.difficulties = [
			{
				name: "Easy",
				value: "easy",
				sizeX: 8,
				sizeY: 8,
				mines: 10
			},
			{
				name: "Medium",
				value: "medium",
				sizeX: 16,
				sizeY: 16,
				mines: 50
			},
			{
				name: "Hard",
				value: "hard",
				sizeX: 30,
				sizeY: 20,
				mines: 100
			}
		];
		this.current_difficulty = "easy";
		// this.current_difficulty = "medium";

		this.change_difficulty = function(){
			if (this.difficulty) {
				this.current_difficulty = this.difficulty.value;
			}
			this.sizeX = this.difficulties.filter(x=>x.value===this.current_difficulty)[0].sizeX;
			this.sizeY = this.difficulties.filter(x=>x.value===this.current_difficulty)[0].sizeY;
			this.mines = this.difficulties.filter(x=>x.value===this.current_difficulty)[0].mines;
			this.reset();
		}

		this.reset = function(){
			this.grid = [];
			this.is_finished = false;
			this.game_over = false;
			for (var i=0;i<this.sizeX*this.sizeY;i++) {
				this.grid.push(0);
			}
			for (var i=0;i<this.mines;i++) {
				place_mine.apply(this,[this.grid]);
			}
			for (var i=0,l=this.grid.length;i<l;i++) {
				write_number.apply(this,[this.grid,i]);
			}
			for (var i=0,l=this.grid.length;i<l;i++) {
				this.grid[i] = {
					item: this.grid[i],
					clicked: false,
					flagged: false
				}
			}
		}

		this.change_difficulty();

		const clear_zeroes = function(grid,index,pool=[]){
			const arr = get_locations_arround_index.apply(this,[index]);
			arr.forEach(x => {
				if (grid[index+x].item === " " && grid[index+x].clicked === false) {
					grid[index+x].clicked = true;
					clear_zeroes.apply(this,[grid,index+x,pool]);
				}
				else {
					grid[index+x].clicked = true;
				}
				pool.push(index+x);
			});
			return pool;
		}

		const check_finished = function(){
			let output = true;
			for (var i=0,l=this.grid.length;i<l;i++) {
				if ( (!this.grid[i].clicked && !this.grid[i].flagged) || (this.grid[i].flagged && this.grid[i].item !== 9) ) {
					output = false;
					break;
				}
			}
			this.is_finished = output;
			if (output) {
				dill.change(this.result);
			}
		}

		this.has_clicked = function(){
			return this.clicked
				? "theme-smoke-light"
				: "";
		}
		this.is_mine = function(){
			return this._item.item === 9;
		}
		this.found = function(){
			let count = 0;
			for (var i=0,l=this.grid.length;i<l;i++) {
				if (this.grid[i].flagged) {
					count++;
				}
			}
			return this.mines - count;
		}
		this.styles = function(){
			const width = 28;
			const background_colour = this._item.bombed ? "background-color:tomato;" : "";
			return "width:"+width+"px;height:"+width+"px;"+background_colour;
		}
		this.container_styles = function(){
			const width = this.sizeX * 28;
			return "width:"+width+"px;";
		}
		this.if_mine = function(){
			return this.flagged;
		}
		this.is_clicked = function(){
			return this.clicked;
		}
		this.text_styles = function(){
			let colour = "#444";
			colour = [null,"blue","green","red","#c3c30d","teal","purpe","grey","black"][this.item];
			return "font-weight:bold;color:"+colour+";";
		}
		this.update = function(){
			if (this.game_over) {
				return false;
			}
			this._item.clicked = true;
			if (this._item.item === 9) {
				this.game_over = true;
				this._item.bombed = true;
				this.grid.forEach(x=>{
					if (x.item === 9) {
						x.clicked = true;
					}
				});
				dill.change();
				return false;
			}
			if (this._item.item === " ") {
				const arr = clear_zeroes.apply(this,[this.grid,this._index]);
				dill.change(arr.reduce((a,b)=>(a.indexOf(b)===-1&&a.push(b),a),[]).map(x=>this.container.children[x]));
			}
			else {
				dill.change(this.container.children[this._index]);
			}
			check_finished.apply(this);
			return false;
		}
		this.right_click = function(event){
			event.preventDefault();
			if (this.game_over || this._item.clicked) {
				return false;
			}
			this._item.flagged = !this._item.flagged;
			check_finished.apply(this);
			dill.change([
				this.container.children[this._index],
				this.mines_found
			]);
			return false;
		}
	}

	const module = dill.module("minesweeper");
	dill.render(document.body,Minesweeper,module);
}());
