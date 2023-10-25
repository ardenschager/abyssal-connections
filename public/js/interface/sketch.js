const cyrb128 = function(str) {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1^h2^h3^h4)>>>0, (h2^h1)>>>0, (h3^h1)>>>0, (h4^h1)>>>0];
}


const sfc32 = function(a, b, c, d) {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
      var t = (a + b) | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}

const mulberry32 = function(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
};

var wordList = [
	// Borrowed from xkcd password generator which borrowed it from wherever
	"ability", "able", "aboard", "about", "above", "accept", "accident", "according",
	"account", "accurate", "acres", "across", "act", "action", "active", "activity",
	"actual", "actually", "add", "addition", "additional", "adjective", "adult", "adventure",
	"advice", "affect", "afraid", "after", "afternoon", "again", "against", "age",
	"ago", "agree", "ahead", "aid", "air", "airplane", "alike", "alive",
	"all", "allow", "almost", "alone", "along", "aloud", "alphabet", "already",
	"also", "although", "am", "among", "amount", "ancient", "angle", "angry",
	"animal", "announced", "another", "answer", "ants", "any", "anybody", "anyone",
	"anything", "anyway", "anywhere", "apart", "apartment", "appearance", "apple", "applied",
	"appropriate", "are", "area", "arm", "army", "around", "arrange", "arrangement",
	"arrive", "arrow", "art", "article", "as", "aside", "ask", "asleep",
	"at", "ate", "atmosphere", "atom", "atomic", "attached", "attack", "attempt",
	"attention", "audience", "author", "automobile", "available", "average", "avoid", "aware",
	"away", "baby", "back", "bad", "badly", "bag", "balance", "ball",
	"balloon", "band", "bank", "bar", "bare", "bark", "barn", "base",
	"baseball", "basic", "basis", "basket", "bat", "battle", "be", "bean",
	"bear", "beat", "beautiful", "beauty", "became", "because", "become", "becoming",
	"bee", "been", "before", "began", "beginning", "begun", "behavior", "behind",
	"being", "believed", "bell", "belong", "below", "belt", "bend", "beneath",
	"bent", "beside", "best", "bet", "better", "between", "beyond", "bicycle",
	"bigger", "biggest", "bill", "birds", "birth", "birthday", "bit", "bite",
	"black", "blank", "blanket", "blew", "blind", "block", "blood", "blow",
	"blue", "board", "boat", "body", "bone", "book", "border", "born",
	"both", "bottle", "bottom", "bound", "bow", "bowl", "box", "boy",
	"brain", "branch", "brass", "brave", "bread", "break", "breakfast", "breath",
	"breathe", "breathing", "breeze", "brick", "bridge", "brief", "bright", "bring",
	"broad", "broke", "broken", "brother", "brought", "brown", "brush", "buffalo",
	"build", "building", "built", "buried", "burn", "burst", "bus", "bush",
	"business", "busy", "but", "butter", "buy", "by", "cabin", "cage",
	"cake", "call", "calm", "came", "camera", "camp", "can", "canal",
	"cannot", "cap", "capital", "captain", "captured", "car", "carbon", "card",
	"care", "careful", "carefully", "carried", "carry", "case", "cast", "castle",
	"cat", "catch", "cattle", "caught", "cause", "cave", "cell", "cent",
	"center", "central", "century", "certain", "certainly", "chain", "chair", "chamber",
	"chance", "change", "changing", "chapter", "character", "characteristic", "charge", "chart",
	"check", "cheese", "chemical", "chest", "chicken", "chief", "child", "children",
	"choice", "choose", "chose", "chosen", "church", "circle", "circus", "citizen",
	"city", "class", "classroom", "claws", "clay", "clean", "clear", "clearly",
	"climate", "climb", "clock", "close", "closely", "closer", "cloth", "clothes",
	"clothing", "cloud", "club", "coach", "coal", "coast", "coat", "coffee",
	"cold", "collect", "college", "colony", "color", "column", "combination", "combine",
	"come", "comfortable", "coming", "command", "common", "community", "company", "compare",
	"compass", "complete", "completely", "complex", "composed", "composition", "compound", "concerned",
	"condition", "congress", "connected", "consider", "consist", "consonant", "constantly", "construction",
	"contain", "continent", "continued", "contrast", "control", "conversation", "cook", "cookies",
	"cool", "copper", "copy", "corn", "corner", "correct", "correctly", "cost",
	"cotton", "could", "count", "country", "couple", "courage", "course", "court",
	"cover", "cow", "cowboy", "crack", "cream", "create", "creature", "crew",
	"crop", "cross", "crowd", "cry", "cup", "curious", "current", "curve",
	"customs", "cut", "cutting", "daily", "damage", "dance", "danger", "dangerous",
	"dark", "darkness", "date", "daughter", "dawn", "day", "dead", "deal",
	"dear", "death", "decide", "declared", "deep", "deeply", "deer", "definition",
	"degree", "depend", "depth", "describe", "desert", "design", "desk", "detail",
	"determine", "develop", "development", "diagram", "diameter", "did", "die", "differ",
	"difference", "different", "difficult", "difficulty", "dig", "dinner", "direct", "direction",
	"directly", "dirt", "dirty", "disappear", "discover", "discovery", "discuss", "discussion",
	"disease", "dish", "distance", "distant", "divide", "division", "do", "doctor",
	"does", "dog", "doing", "doll", "dollar", "done", "donkey", "door",
	"dot", "double", "doubt", "down", "dozen", "draw", "drawn", "dream",
	"dress", "drew", "dried", "drink", "drive", "driven", "driver", "driving",
	"drop", "dropped", "drove", "dry", "duck", "due", "dug", "dull",
	"during", "dust", "duty", "each", "eager", "ear", "earlier", "early",
	"earn", "earth", "easier", "easily", "east", "easy", "eat", "eaten",
	"edge", "education", "effect", "effort", "egg", "eight", "either", "electric",
	"electricity", "element", "elephant", "eleven", "else", "empty", "end", "enemy",
	"energy", "engine", "engineer", "enjoy", "enough", "enter", "entire", "entirely",
	"environment", "equal", "equally", "equator", "equipment", "escape", "especially", "essential",
	"establish", "even", "evening", "event", "eventually", "ever", "every", "everybody",
	"everyone", "everything", "everywhere", "evidence", "exact", "exactly", "examine", "example",
	"excellent", "except", "exchange", "excited", "excitement", "exciting", "exclaimed", "exercise",
	"exist", "expect", "experience", "experiment", "explain", "explanation", "explore", "express",
	"expression", "extra", "eye", "face", "facing", "fact", "factor", "factory",
	"failed", "fair", "fairly", "fall", "fallen", "familiar", "family", "famous",
	"far", "farm", "farmer", "farther", "fast", "fastened", "faster", "fat",
	"father", "favorite", "fear", "feathers", "feature", "fed", "feed", "feel",
	"feet", "fell", "fellow", "felt", "fence", "few", "fewer", "field",
	"fierce", "fifteen", "fifth", "fifty", "fight", "fighting", "figure", "fill",
	"film", "final", "finally", "find", "fine", "finest", "finger", "finish",
	"fire", "fireplace", "firm", "first", "fish", "five", "fix", "flag",
	"flame", "flat", "flew", "flies", "flight", "floating", "floor", "flow",
	"flower", "fly", "fog", "folks", "follow", "food", "foot", "football",
	"for", "force", "foreign", "forest", "forget", "forgot", "forgotten", "form",
	"former", "fort", "forth", "forty", "forward", "fought", "found", "four",
	"fourth", "fox", "frame", "free", "freedom", "frequently", "fresh", "friend",
	"friendly", "frighten", "frog", "from", "front", "frozen", "fruit", "fuel",
	"full", "fully", "fun", "function", "funny", "fur", "furniture", "further",
	"future", "gain", "game", "garage", "garden", "gas", "gasoline", "gate",
	"gather", "gave", "general", "generally", "gentle", "gently", "get", "getting",
	"giant", "gift", "girl", "give", "given", "giving", "glad", "glass",
	"globe", "go", "goes", "gold", "golden", "gone", "good", "goose",
	"got", "government", "grabbed", "grade", "gradually", "grain", "grandfather", "grandmother",
	"graph", "grass", "gravity", "gray", "great", "greater", "greatest", "greatly",
	"green", "grew", "ground", "group", "grow", "grown", "growth", "guard",
	"guess", "guide", "gulf", "gun", "habit", "had", "hair", "half",
	"halfway", "hall", "hand", "handle", "handsome", "hang", "happen", "happened",
	"happily", "happy", "harbor", "hard", "harder", "hardly", "has", "hat",
	"have", "having", "hay", "he", "headed", "heading", "health", "heard",
	"hearing", "heart", "heat", "heavy", "height", "held", "hello", "help",
	"helpful", "her", "herd", "here", "herself", "hidden", "hide", "high",
	"higher", "highest", "highway", "hill", "him", "himself", "his", "history",
	"hit", "hold", "hole", "hollow", "home", "honor", "hope", "horn",
	"horse", "hospital", "hot", "hour", "house", "how", "however", "huge",
	"human", "hundred", "hung", "hungry", "hunt", "hunter", "hurried", "hurry",
	"hurt", "husband", "ice", "idea", "identity", "if", "ill", "image",
	"imagine", "immediately", "importance", "important", "impossible", "improve", "in", "inch",
	"include", "including", "income", "increase", "indeed", "independent", "indicate", "individual",
	"industrial", "industry", "influence", "information", "inside", "instance", "instant", "instead",
	"instrument", "interest", "interior", "into", "introduced", "invented", "involved", "iron",
	"is", "island", "it", "its", "itself", "jack", "jar", "jet",
	"job", "join", "joined", "journey", "joy", "judge", "jump", "jungle",
	"just", "keep", "kept", "key", "kids", "kill", "kind", "kitchen",
	"knew", "knife", "know", "knowledge", "known", "label", "labor", "lack",
	"lady", "laid", "lake", "lamp", "land", "language", "large", "larger",
	"largest", "last", "late", "later", "laugh", "law", "lay", "layers",
	"lead", "leader", "leaf", "learn", "least", "leather", "leave", "leaving",
	"led", "left", "leg", "length", "lesson", "let", "letter", "level",
	"library", "lie", "life", "lift", "light", "like", "likely", "limited",
	"line", "lion", "lips", "liquid", "list", "listen", "little", "live",
	"living", "load", "local", "locate", "location", "log", "lonely", "long",
	"longer", "look", "loose", "lose", "loss", "lost", "lot", "loud",
	"love", "lovely", "low", "lower", "luck", "lucky", "lunch", "lungs",
	"lying", "machine", "machinery", "mad", "made", "magic", "magnet", "mail",
	"main", "mainly", "major", "make", "making", "man", "managed", "manner",
	"manufacturing", "many", "map", "mark", "market", "married", "mass", "massage",
	"master", "material", "mathematics", "matter", "may", "maybe", "me", "meal",
	"mean", "means", "meant", "measure", "meat", "medicine", "meet", "melted",
	"member", "memory", "men", "mental", "merely", "met", "metal", "method",
	"mice", "middle", "might", "mighty", "mile", "military", "milk", "mill",
	"mind", "mine", "minerals", "minute", "mirror", "missing", "mission", "mistake",
	"mix", "mixture", "model", "modern", "molecular", "moment", "money", "monkey",
	"month", "mood", "moon", "more", "morning", "most", "mostly", "mother",
	"motion", "motor", "mountain", "mouse", "mouth", "move", "movement", "movie",
	"moving", "mud", "muscle", "music", "musical", "must", "my", "myself",
	"mysterious", "nails", "name", "nation", "national", "native", "natural", "naturally",
	"nature", "near", "nearby", "nearer", "nearest", "nearly", "necessary", "neck",
	"needed", "needle", "needs", "negative", "neighbor", "neighborhood", "nervous", "nest",
	"never", "new", "news", "newspaper", "next", "nice", "night", "nine",
	"no", "nobody", "nodded", "noise", "none", "noon", "nor", "north",
	"nose", "not", "note", "noted", "nothing", "notice", "noun", "now",
	"number", "numeral", "nuts", "object", "observe", "obtain", "occasionally", "occur",
	"ocean", "of", "off", "offer", "office", "officer", "official", "oil",
	"old", "older", "oldest", "on", "once", "one", "only", "onto",
	"open", "operation", "opinion", "opportunity", "opposite", "or", "orange", "orbit",
	"order", "ordinary", "organization", "organized", "origin", "original", "other", "ought",
	"our", "ourselves", "out", "outer", "outline", "outside", "over", "own",
	"owner", "oxygen", "pack", "package", "page", "paid", "pain", "paint",
	"pair", "palace", "pale", "pan", "paper", "paragraph", "parallel", "parent",
	"park", "part", "particles", "particular", "particularly", "partly", "parts", "party",
	"pass", "passage", "past", "path", "pattern", "pay", "peace", "pen",
	"pencil", "people", "per", "percent", "perfect", "perfectly", "perhaps", "period",
	"person", "personal", "pet", "phrase", "physical", "piano", "pick", "picture",
	"pictured", "pie", "piece", "pig", "pile", "pilot", "pine", "pink",
	"pipe", "pitch", "place", "plain", "plan", "plane", "planet", "planned",
	"planning", "plant", "plastic", "plate", "plates", "play", "pleasant", "please",
	"pleasure", "plenty", "plural", "plus", "pocket", "poem", "poet", "poetry",
	"point", "pole", "police", "policeman", "political", "pond", "pony", "pool",
	"poor", "popular", "population", "porch", "port", "position", "positive", "possible",
	"possibly", "post", "pot", "potatoes", "pound", "pour", "powder", "power",
	"powerful", "practical", "practice", "prepare", "present", "president", "press", "pressure",
	"pretty", "prevent", "previous", "price", "pride", "primitive", "principal", "principle",
	"printed", "private", "prize", "probably", "problem", "process", "produce", "product",
	"production", "program", "progress", "promised", "proper", "properly", "property", "protection",
	"proud", "prove", "provide", "public", "pull", "pupil", "pure", "purple",
	"purpose", "push", "put", "putting", "quarter", "queen", "question", "quick",
	"quickly", "quiet", "quietly", "quite", "rabbit", "race", "radio", "railroad",
	"rain", "raise", "ran", "ranch", "range", "rapidly", "rate", "rather",
	"raw", "rays", "reach", "read", "reader", "ready", "real", "realize",
	"rear", "reason", "recall", "receive", "recent", "recently", "recognize", "record",
	"red", "refer", "refused", "region", "regular", "related", "relationship", "religious",
	"remain", "remarkable", "remember", "remove", "repeat", "replace", "replied", "report",
	"represent", "require", "research", "respect", "rest", "result", "return", "review",
	"rhyme", "rhythm", "rice", "rich", "ride", "riding", "right", "ring",
	"rise", "rising", "river", "road", "roar", "rock", "rocket", "rocky",
	"rod", "roll", "roof", "room", "root", "rope", "rose", "rough",
	"round", "route", "row", "rubbed", "rubber", "rule", "ruler", "run",
	"running", "rush", "sad", "saddle", "safe", "safety", "said", "sail",
	"sale", "salmon", "salt", "same", "sand", "sang", "sat", "satellites",
	"satisfied", "save", "saved", "saw", "say", "scale", "scared", "scene",
	"school", "science", "scientific", "scientist", "score", "screen", "sea", "search",
	"season", "seat", "second", "secret", "section", "see", "seed", "seeing",
	"seems", "seen", "seldom", "select", "selection", "sell", "send", "sense",
	"sent", "sentence", "separate", "series", "serious", "serve", "service", "sets",
	"setting", "settle", "settlers", "seven", "several", "shade", "shadow", "shake",
	"shaking", "shall", "shallow", "shape", "share", "sharp", "she", "sheep",
	"sheet", "shelf", "shells", "shelter", "shine", "shinning", "ship", "shirt",
	"shoe", "shoot", "shop", "shore", "short", "shorter", "shot", "should",
	"shoulder", "shout", "show", "shown", "shut", "sick", "sides", "sight",
	"sign", "signal", "silence", "silent", "silk", "silly", "silver", "similar",
	"simple", "simplest", "simply", "since", "sing", "single", "sink", "sister",
	"sit", "sitting", "situation", "six", "size", "skill", "skin", "sky",
	"slabs", "slave", "sleep", "slept", "slide", "slight", "slightly", "slip",
	"slipped", "slope", "slow", "slowly", "small", "smaller", "smallest", "smell",
	"smile", "smoke", "smooth", "snake", "snow", "so", "soap", "social",
	"society", "soft", "softly", "soil", "solar", "sold", "soldier", "solid",
	"solution", "solve", "some", "somebody", "somehow", "someone", "something", "sometime",
	"somewhere", "son", "song", "soon", "sort", "sound", "source", "south",
	"southern", "space", "speak", "special", "species", "specific", "speech", "speed",
	"spell", "spend", "spent", "spider", "spin", "spirit", "spite", "split",
	"spoken", "sport", "spread", "spring", "square", "stage", "stairs", "stand",
	"standard", "star", "stared", "start", "state", "statement", "station", "stay",
	"steady", "steam", "steel", "steep", "stems", "step", "stepped", "stick",
	"stiff", "still", "stock", "stomach", "stone", "stood", "stop", "stopped",
	"store", "storm", "story", "stove", "straight", "strange", "stranger", "straw",
	"stream", "street", "strength", "stretch", "strike", "string", "strip", "strong",
	"stronger", "struck", "structure", "struggle", "stuck", "student", "studied", "studying",
	"subject", "substance", "success", "successful", "such", "sudden", "suddenly", "sugar",
	"suggest", "suit", "sum", "summer", "sun", "sunlight", "supper", "supply",
	"support", "suppose", "sure", "surface", "surprise", "surrounded", "swam", "sweet",
	"swept", "swim", "swimming", "swing", "swung", "syllable", "symbol", "system",
	"table", "tail", "take", "taken", "tales", "talk", "tall", "tank",
	"tape", "task", "taste", "taught", "tax", "tea", "teach", "teacher",
	"team", "tears", "teeth", "telephone", "television", "tell", "temperature", "ten",
	"tent", "term", "terrible", "test", "than", "thank", "that", "thee",
	"them", "themselves", "then", "theory", "there", "therefore", "these", "they",
	"thick", "thin", "thing", "think", "third", "thirty", "this", "those",
	"thou", "though", "thought", "thousand", "thread", "three", "threw", "throat",
	"through", "throughout", "throw", "thrown", "thumb", "thus", "thy", "tide",
	"tie", "tight", "tightly", "till", "time", "tin", "tiny", "tip",
	"tired", "title", "to", "tobacco", "today", "together", "told", "tomorrow",
	"tone", "tongue", "tonight", "too", "took", "tool", "top", "topic",
	"torn", "total", "touch", "toward", "tower", "town", "toy", "trace",
	"track", "trade", "traffic", "trail", "train", "transportation", "trap", "travel",
	"treated", "tree", "triangle", "tribe", "trick", "tried", "trip", "troops",
	"tropical", "trouble", "truck", "trunk", "truth", "try", "tube", "tune",
	"turn", "twelve", "twenty", "twice", "two", "type", "typical", "uncle",
	"under", "underline", "understanding", "unhappy", "union", "unit", "universe", "unknown",
	"unless", "until", "unusual", "up", "upon", "upper", "upward", "us",
	"use", "useful", "using", "usual", "usually", "valley", "valuable", "value",
	"vapor", "variety", "various", "vast", "vegetable", "verb", "vertical", "very",
	"vessels", "victory", "view", "village", "visit", "visitor", "voice", "volume",
	"vote", "vowel", "voyage", "wagon", "wait", "walk", "wall", "want",
	"war", "warm", "warn", "was", "wash", "waste", "watch", "water",
	"wave", "way", "we", "weak", "wealth", "wear", "weather", "week",
	"weigh", "weight", "welcome", "well", "went", "were", "west", "western",
	"wet", "whale", "what", "whatever", "wheat", "wheel", "when", "whenever",
	"where", "wherever", "whether", "which", "while", "whispered", "whistle", "white",
	"who", "whole", "whom", "whose", "why", "wide", "widely", "wife",
	"wild", "will", "willing", "win", "wind", "window", "wing", "winter",
	"wire", "wise", "wish", "with", "within", "without", "wolf", "women",
	"won", "wonder", "wonderful", "wood", "wooden", "wool", "word", "wore",
	"work", "worker", "world", "worried", "worry", "worse", "worth", "would",
	"wrapped", "write", "writer", "writing", "written", "wrong", "wrote", "yard",
	"year", "yellow", "yes", "yesterday", "yet", "you", "young", "younger",
	"your", "yourself", "youth", "zero", "zebra", "zipper", "zoo", "zulu"
];

function randomWords(options) {

	function word() {
		if (options && options.maxLength > 1) {
			return generateWordWithMaxLength();
		} else {
			return generateRandomWord();
		}
	}

	function generateWordWithMaxLength() {
		var rightSize = false;
		var wordUsed;
		while (!rightSize) {
			wordUsed = generateRandomWord();
			if (wordUsed.length <= options.maxLength) {
				rightSize = true;
			}

		}
		return wordUsed;
	}

	function generateRandomWord() {
		return wordList[randInt(wordList.length)];
	}

	function randInt(lessThan) {
		return Math.floor(Math.random() * lessThan);
	}

	// No arguments = generate one word
	if (typeof (options) === 'undefined') {
		return word();
	}

	// Just a number = return that many words
	if (typeof (options) === 'number') {
		options = { exactly: options };
	}

	// options supported: exactly, min, max, join
	if (options.exactly) {
		options.min = options.exactly;
		options.max = options.exactly;
	}

	// not a number = one word par string
	if (typeof (options.wordsPerString) !== 'number') {
		options.wordsPerString = 1;
	}

	//not a function = returns the raw word
	if (typeof (options.formatter) !== 'function') {
		options.formatter = (word) => word;
	}

	//not a string = separator is a space
	if (typeof (options.separator) !== 'string') {
		options.separator = ' ';
	}

	var total = options.min + randInt(options.max + 1 - options.min);
	var results = [];
	var token = '';
	var relativeIndex = 0;

	for (var i = 0; (i < total * options.wordsPerString); i++) {
		if (relativeIndex === options.wordsPerString - 1) {
			token += options.formatter(word(), relativeIndex);
		}
		else {
			token += options.formatter(word(), relativeIndex) + options.separator;
		}
		relativeIndex++;
		if ((i + 1) % options.wordsPerString === 0) {
			results.push(token);
			token = '';
			relativeIndex = 0;
		}

	}
	if (typeof options.join === 'string') {
		results = results.join(options.join);
	}

	return results;
}

const cyrb53 = function(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
    h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1>>>0);
};

let gameManager;

function hashWord(word) {
	const hw = cyrb53(word);
	return hw;
}

class GameManager {
	constructor() {
		
		this.words = [];
		this.numScored = 0;
		this.score = 0;
	}

	initialize(settings) {
		this._numWords = settings.CTR.language.model.numWords;
		this._seedWord = settings.CTR.language.model.seed;
		this._seed = cyrb128(this._seedWord);
		this._random = sfc32(this._seed[0], this._seed[1], this._seed[2], this._seed[3]);
	}

	get count() {
		return this.words.length;
	}

	popScore() {
		const score = this.score;
		this.score = 0;
		this.numScored = 0;
		return score;
	}

	addToScore(word) {
		let numScored = 0;
		let wordNum = hashWord(word) % this._numWords;
		score += wordNum;
		this.numScore++;
	}
}
  

let settings;
class ServerHelper {
	constructor(debug = true) {
		this._socket = io("/interface");
		this._debug = debug;
		this.init = false;
		this._socket.on("init", (_settings) => {
			this.log("initialized with: " + _settings);
			settings = _settings;
			gameManager.initialize(settings);
			this.init = true;
		});

		this._time = 0;
	}

	get id() {
		return this._socket.id;
	}

	log(message) {
		if (!this._debug) return;
		console.log("ServerHelper: ", message);
	}

	addFood() {
		this._socket.emit("add-snack");
	}

	emitTopic(position, topic) {
		this._socket.emit("disperse-topic", position, topic);
	}

}

// class Button {
// 	constructor(w, h, c0, c1, c2) {
// 	  this._width = w;
// 	  this._height = h;
// 	  this._c0 = c0;
// 	  this._c1 = c1;
// 	  this._c2 = c2;
// 	  this.pressed = false;
// 	}
	
// 	resize(w, h) {
// 	  this._width = w;
// 	  this._height = h;
// 	}
	
// 	// overwrite
// 	onClick() {
	
// 	}
//   }
  
//   class RectangleButton extends Button {
// 	constructor(w, h, c0, c1, c2) {
// 	  super(w, h, c0, c1, c2);
// 	}
	
// 	setBounds(dx, dy, type) {
// 	  if (type == 'leftAlign') {
// 		this._x0 = windowWidth - dx - this._width;
// 		this._x1 = windowWidth - dx;
// 	  } else if (type == 'rightAlign') {
// 		this._x0 = dx;
// 		this._x1 = this._width + dx;
// 	  } else if (type == 'center') {
// 		this._x0 = windowWidth / 2 - this._width / 2 - dx;
// 		this._x1 = windowWidth / 2 + this._width / 2 + dx;
// 	  }
// 	  this._y0 = windowHeight - dy - this._height;
// 	  this._y1 = windowHeight - dy;
// 	}
	
// 	inBounds(x, y) {
// 	  if (x > this._x0 && x < this._x0 + this._width && y > this._y0 && y < this._y0 + this._height) {
// 		return true;
// 	  } else {  
// 		return false; 
// 	  }
// 	}
	
// 	draw() {
// 	  colorMode(RGB, 255);
// 	  noStroke();
// 	  if (this.pressed) {
// 		fill(this._c2);
// 	  } else if (this.mousedOver) {
// 		fill(this._c1);
// 	  } else {
// 		fill(this._c0);
// 	  }
// 	  rect(this._x0, this._y0, this._width, this._height, 150);
// 	}
//   }
  

//   const START_SPECTRUM = 200;
//   class Spectrum {
	
// 	constructor() {
// 	  this.mic = new p5.AudioIn();
// 	  this.mic.start();
// 	  this.fft = new p5.FFT();
// 	  this.fft.setInput(this.mic);
// 	  this.currHighest = 0;
// 	  this.prevHighest = 0;
// 	  this._t = 0;
// 	}
	
// 	draw() {
// 	//   blendMode(SCREEN);

// 	  let spectrum = this.fft.analyze();
// 	  colorMode(HSB, 1);
// 	  strokeWeight(12);
// 	  this._t = frameCount;
// 	  const numSpectrums = spectrum.length - Math.floor(spectrum.length / 3.2);
// 	  let highest = -1;
// 	  let highIdx = -1;
// 	  for (let i = START_SPECTRUM; i < numSpectrums; i++) {
// 		const rat = i / spectrum.length;
// 		const n = noise(rat + this._t * 0.001, -this._t * 0.005 + rat);
// 		let hue = (n * rat * 100) % 1;
// 		hue = Math.pow(hue, n * 2.5 + 2.5);
// 		// hue = Math.sin(hue + Math.sin(hue * 2.5));
// 		stroke(hue, 0.4, 1.2);
// 		const y0 = map(spectrum[i-1] * 1, 0, 255, height / 2.2, 0);
// 		const y1 = map(spectrum[i] * 1, 0, 255, height / 2.2, 0);
// 		if (spectrum[i] > highest) {
// 		  highIdx = i;
// 		  highest = spectrum[i];
// 		}
// 		const x0 = (i - 1 - START_SPECTRUM) * width / (numSpectrums - START_SPECTRUM);
// 		const x1 = (i - 1 - START_SPECTRUM) * width / (numSpectrums - START_SPECTRUM);
// 		line(x0, y0, x1, y1);
// 	  }
// 		this.curHighest = lerp(this.prevHighest, highest, 0.1);
// 		// console.log(this.curHighest);
// 	  }
	  
//   }
  
//   let serverHelper;
//   let buttons = [];
//   let spectrum;
//   const C = 0.8;
  
//   function setup() {
// 	createCanvas(windowWidth, windowHeight);
// 	spectrum = new Spectrum();
// 	serverHelper = new ServerHelper();
// 	const b0c0 = color(100 * C, 160 * C, 240 * C);
// 	const b0c1 = color(120 * C, 180 * C, 240 * C);
// 	const b0c2 = color(100 * C, 100 * C, 150 * C);
  
  
// 	const b1c0 = color(70 * C, 180 * C, 70 * C);
// 	const b1c1 = color(90 * C, 200 * C, 90 * C);
// 	const b1c2 = color(50 * C, 150 * C, 90 * C);
   
// 	buttons[0] = new RectangleButton(windowWidth / 3, windowHeight / 3, b0c0, b0c1, b0c2);
// 	buttons[0].setBounds(windowWidth / 5, windowWidth / 8, 'center');
// 	buttons[0].onClick = () => {

// 		if (settings != null) {
// 			const numWords = settings.CTR.language.model.numWords;
// 			let word = Math.min(1, Math.max(0, Math.min(1, spectrum.curHighest / 30))) * (numWords - 1);
// 			word = Math.floor(word);
// 			serverHelper.emitTopic(null, word);
// 		}
// 	}
// 	buttons[1] = new RectangleButton(windowWidth / 3, windowHeight / 3, b1c0, b1c1, b1c2);
// 	buttons[1].setBounds(-windowWidth / 5, windowWidth / 8, 'center');
// 	buttons[1].onClick = () => {
// 		if (settings != null) {
// 			serverHelper.addFood();
// 		}
// 	}
//   }
  
//   function draw() {
// 	// blendMode(MULTIPLY);
//   	background('rgba(20,20,20, 0.15)');
// 	spectrum.draw();
// 	for (let button of buttons) {
// 	  if (button.inBounds(mouseX, mouseY)) {
// 		button.mousedOver = true;
// 	  } else {
// 		button.mousedOver = false;
// 	  }
// 	  button.draw();
// 	}
	
//   }
  
//   function windowResized() {
// 	  resizeCanvas(windowWidth, windowHeight);
// 	  for (let button of buttons) {
// 		button.resize(windowWidth / 3, windowHeight / 3)
// 	  }
//   }
  
//   function mousePressed() {
   
//   }
  
//   function mouseReleased() {
// 	for (let button of buttons) {
// 	  if (button.inBounds(mouseX, mouseY)) {
// 		button.onClick();
// 	  }
// 	}
//   }


let buttons = [];

class Button {
	constructor(c0, c1, c2) {
	  // this._width = w;
	  // this._height = h;
	  this._c0 = c0;
	  this._c1 = c1;
	  this._c2 = c2;
	  this.pressed = false;
	}
	
	resize(w, h) {
	  this._width = w;
	  this._height = h;
	}
	
	// overwrite
	onClick() {
	
	}
  }
  
  class RectangleButton extends Button {
	constructor(word, c0, c1, c2, c3) {
	  super(c0, c1, c2);
	  this._word = word;
	  this._c3 = c3;
	}
	
	setTransform(x, y, w, h) {
	  this._x0 = x;
	  this._x1 = x + w;
	  this._y0 = y;
	  this._y0 = y + h;
	  this._width = w;
	  this._height = h;
	}

	// get word() {
	// 	return this._word;
	// }

	set word(value) {
		this._word = word;
	}
	
	// setBounds(dx, dy, type) {
	//   if (type == 'leftAlign') {
	//     this._x0 = this.x - dx - this._width;
	//     this._x1 = windowWidth = this.x - dx;
	//   } else if (type == 'rightAlign') {
	//     this._x0 = dx;
	//     this._x1 = this._width + dx;
	//   } else if (type == 'center') {
	//     this._x0 = windowWidth / 2 - this._width / 2 - dx;
	//     this._x1 = windowWidth / 2 + this._width / 2 + dx;
	//   }
	//   this._y0 = this.y - dy - this._height;
	//   this._y1 = windowHeight - this.y - dy;
	// }
	
	inBounds(x, y) {
	  if (x > this._x0 && x < this._x0 + this._width && y > this._y0 && y < this._y0 + this._height) {
		return true;
	  } else {  
		return false; 
	  }
	}

	get word() {
		if (!this.isFood) {
			return this._word;
		} else {
			return "food";
		}
	}
	
	draw() {
	  colorMode(RGB, 255);
	  noStroke();
	  if (this.pressed) {
		fill(this._c2);
	  } else if (this.mousedOver) {
		fill(this._c1);
	  } else {
		fill(this._c0);
	  }
	  rect(this._x0, this._y0, this._width, this._height);
	  fill(this._c3);
	  ellipse(this._x0 + this._width / 2, this._y0 + this._height / 2, this._width, this._height);
	  fill(color('white'));
	  textSize(windowWidth / 20);
	  textAlign(CENTER, CENTER);
	  let toSend;
	  if (this.isFood) {
		toSend = "Send "
	  } else {
		toSend = "Send word: \n"
	  }
	  text(toSend += this.word, this._x0 + this._width / 2, this._y0 + this._height / 2);
	}
  }
  
  // let spectrum;
  
  function setTransforms(rowNum, colNum, gapPercentW, gapPercentH) {
  
	const gapWidth = windowWidth / gapPercentW;
	const gapHeight = windowHeight / gapPercentH;
	const buttonWidth = windowWidth / colNum - gapWidth - gapWidth / colNum;
	const buttonHeight = windowHeight / rowNum - gapHeight - gapHeight / rowNum;
	for (let i = 0; i < rowNum; i++) {
	  for (let j = 0; j < colNum; j++) {
		let idx = i * colNum + j;
		let x = gapWidth + j * buttonWidth + gapWidth * (j);
		let y = gapHeight + (i - 1) * buttonHeight + gapHeight * (i);
		buttons[idx].setTransform(x, y, buttonWidth, buttonHeight);
	  }
	}
  }
  
  const rowNum = 3;
  const colNum = 2;
  const gapPercentW = 40;
  const gapPercentH = 40;
  
  let score = 0;
  let numScored = 0;
  let randy;

  function resetButtons() {
	createCanvas(windowWidth, windowHeight);
	// spectrum = new Spectrum();
	gameManager = new GameManager();
	serverHelper = new ServerHelper();
	const c0 = color(40, 100, 135);
	const c1 = color(60, 200, 250);
	const c2 = color(30, 30, 60);
	const c3 = color(30, 30, 50, 90);
  
  
	const b1c0 = color(70, 180, 70);
	const b1c1 = color(90, 200, 90);
	const b1c2 = color(10, 10, 20);

	let words = randomWords(rowNum * colNum);
   
  
	for (let i = 0; i < rowNum; i++) {
	  for (let j = 0; j < colNum; j++) {
		let idx = i * colNum + j;
		let word = words[idx];
		if (idx == colNum * rowNum - 1) {
			buttons[idx] = new RectangleButton(word, b1c0, b1c1, b1c2, c3);
			buttons[idx].isFood = true;
		} else {
			buttons[idx] = new RectangleButton(word, c0, c1, c2, c3);
		}
	  }
	}
	setTransforms(rowNum, colNum, gapPercentW, gapPercentH);
  }

  function stopTouchScrolling(canvas){
	// Prevent scrolling when touching the canvas
	document.body.addEventListener("touchstart", function (e) {
		if (e.target == canvas) {
			e.preventDefault();
		}
	}, { passive: false });
	document.body.addEventListener("touchend", function (e) {
		if (e.target == canvas) {
			e.preventDefault();
		}
	}, { passive: false });
	document.body.addEventListener("touchmove", function (e) {
		if (e.target == canvas) {
			e.preventDefault();
		}
	}, { passive: false });
	
}
  
  function setup() {
	resetButtons();
	// To get the scroll position of current webpage
	const TopScroll = window.pageYOffset || document.documentElement.scrollTop;
	const LeftScroll = window.pageXOffset || document.documentElement.scrollLeft;

	// if scroll happens, set it to the previous value
	window.onscroll = function () {
		window.scrollTo(LeftScroll, TopScroll);
	};
	// stopTouchScrolling(document.getElementById('drawingCanvas'));
  }

  
  
  function draw() {
	background(5, 10, 20);
	// spectrum.draw();
	setTransforms(rowNum, colNum, gapPercentW, gapPercentH);
	for (let button of buttons) {
	  if (mouseIsPressed === true) {
		if (button.inBounds(mouseX, mouseY)) {
			// if (!button.mousedOver) {
			// 	gameManager.addToScore(button.word);
			// }
			button.mousedOver = true;
		}
	  } else {
		button.mousedOver = false;
	  }
	  button.draw();
	}
	
  }
  
  function windowResized() {
	  resizeCanvas(windowWidth, windowHeight);
	  for (let button of buttons) {
		// button.resize(windowWidth / 3, windowHeight / 3)
	  }
  }
  
  function mousePressed() {
	for (let button of buttons) {
	  if (button.inBounds(mouseX, mouseY) && !button.pressed) {
		// button.pressed = true;
		// button.onClick();
		if (!button.isFood) {
			gameManager.addToScore(button.word);
			emitScore();
			button.word = randomWords();
		} else {
			serverHelper.addFood();
		}
	  }
	}
   
  }

  function emitScore() {
	if (settings != null) {
		const numWords = settings.CTR.language.model.numWords;
		let wordNum = score % numWords; // hash? 
		serverHelper.emitTopic(null, wordNum);
		score = 0;
		numScored = 0;
	}
  }
  
  function mouseReleased() {
	for (let button of buttons) {
	  button.pressed = false;  
	  button.mousedOver = false;
	}
	score = 0;
  }