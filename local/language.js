const Markov = require('js-markov');
const Utils = require('./utils.js');
const {CTR} = require("./constants.js");

// Class for generating a markov model with random numbers to use as a 'language'
class SimpleLanguageModel {
	constructor() {
		this._markov = new Markov('numeric');
		this._network = new Set([0]);
		this._states = [];
		this._numConnections = 0;
		// Initialize from settings
		this._seedWord = CTR.language.model.seed;
		this._numWords = CTR.language.model.numWords;
		this._initialProb = CTR.language.model.initialProb;
		this._numRuns = CTR.language.model.numRuns;
		this._connectAll = CTR.language.model.connectAll;
		this._connectToSelf = CTR.language.model.connectToSelf;
	}

	get states() {
		return this._states;
	}

	init(modelJson=null) {
		const seed = Utils.cyrb128(this._seedWord);
		this._random = Utils.sfc32(seed[0], seed[1], seed[2], seed[3]);
		if (modelJson == null) {
			this._initializeGraph();
			this._populateGraph();
			this._densifyGraph();
			if (this._connectAll) {
				this._connectAllNodes();
			}
			if (this._connectToSelf) {
				this._connectAllToSelf();
			}
		} else {
			this._states = JSON.parse(modelJson);
		}
		this._markov.addStates(this._states);
		this._markov.train();
		return this;
	}

	sample(state) {
		return this._markov.predict(state);
	}

	randomIndex(useDefaultRandom=true) {
		if (useDefaultRandom) {
			return Math.floor(Math.random() * this._network.size);
		} else {
			return Math.floor(this._random() * this._network.size);
		}
	}

	exportJson() {
		return JSON.stringify(this._states.toJSON());
	}

	_initializeGraph() {
		for (let i = 0; i < this._numWords; i++) {
			this._states.push({
				state: i,
				predictions: [],
			});
		}
	}

	// Erdős–Rényi model
	// https://en.wikipedia.org/wiki/Erd%C5%91s%E2%80%93R%C3%A9nyi_model
	// Connect nodes randomly into network with probability p
	_populateGraph() {
		while(this._network.size <= 1) { // connect *something*
			for (let i = 0; i < this._numWords; i++) {
				const network = [...this._network]; // set to array
				for (let node of network) {
					if (this._initialProb > this._random()) {
						this._network.add(i);
						this._states[i].predictions.push(node);
						this._numConnections++;
					}
				}
			}
		}
	}

	// Barabási–Albert random graph model
	// https://en.wikipedia.org/wiki/Barab%C3%A1si%E2%80%93Albert_model
	// Make some nodes have a higher weight/centralization
	_densifyGraph() {
		for (let j = 0; j < this._numRuns; j++ ) {
			for (let i = 0; i < this._numWords; i++) {
				const network = [...this._network]; // set to array
				this._shuffleArray(network);
				let addToNetwork = false;
				for (let n of network) {
					const numNodeConnections = this._states[n].predictions.length;
					const p = numNodeConnections / this._numConnections;
					if (p > this._random()) {
						this._states[i].predictions.push(n);
						this._numConnections++;
						addToNetwork = true;
					}
				}
				if (addToNetwork) {
					this._network.add(i);
				}
			}
		}
	}

	_connectAllToSelf() {
		for (let i = 0; i < this._numWords; i++) {
			this._states[i].predictions.push(i);
		}
	}

	// Cheating... If there is any node with no predictions, give it a random one
	_connectAllNodes() {
		for (let i = 0; i < this._numWords; i++) {
			const numNodeConnections = this._states[i].predictions.length;
			if (numNodeConnections == 0) {
				const index = this.randomIndex(false);
				this._states[i].predictions.push(index);
			}
		}
	}

	// Shuffle array using internal random number generator
	// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
	_shuffleArray(array) {
		for (var i = array.length - 1; i > 0; i--) {
			var j = Math.floor(this._random() * (i + 1));
			var temp = array[i];
			array[i] = array[j];
			array[j] = temp;
		}
	}
}

module.exports.SimpleLanguageModel = SimpleLanguageModel;