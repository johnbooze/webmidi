// Using https://github.com/djipco/webmidi

// Midi note numbers
// C4 = 60
// C0 = 12
// C-1 = 0
// noteNumber % 12 = number of semitones relative to the C
let noteOffsetMap = new Map([
	["C",  0],
	["C#", 1],
	["Db", 1],
	["D",  2],
	["D#", 3],
	["Eb", 3],
	["E",  4],
	["F",  5],
	["F#", 6],
	["Gb", 6],
	["G",  7],
	["G#", 8],
	["Ab", 8],
	["A",  9],
	["A#", 10],
	["Bb", 10],
	["B",  11]
]);

// Maps offset from C to note name
let noteNameMap = new Map([
	[0,  "C"],
	[1,  "Db"],
	[2,  "D"],
	[3,  "Eb"],
	[4,  "E"],
	[5,  "F"],
	[6,  "F#"],
	[7,  "G"],
	[8, "Ab"],
	[9, "A"],
	[10, "Bb"],
	[11, "B"]
]);

let majorChordDegrees = [
	{"name":  "I", "quality": "M"},
	{"name": "ii", "quality": "m"},
	{"name": "iii", "quality": "m"},
	{"name": "IV", "quality": "M"},
	{"name":  "V", "quality": "M"},
	{"name": "vi", "quality": "m"},
	{"name": "vii dim", "quality": "dim"}
];

let chordQualityIntervalMap = new Map([
	["M",   [0, 4, 7]],
	["m",   [0, 3, 7]],
	["dim", [0, 3, 6]]
])

let majorChordDegreeMap = new Map([
	["I",   0],
	["ii",  1],
	["iii", 2],
	["IV",  3],
	["V",   4],
	["vi",  5],
	["vii dim", 6]
]);

function getRandomIntInclusive(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
}

class NoteSequence {
	#index = 0;
	constructor(notes)
	{
		this.notes = notes;
	}
	
	// returns (correctNotePlayed, isDone)
	tryPlay(note)
	{
		if (this.notes[this.#index] === note)
		{
			this.#index++;
			return [true, this.isDone()];
		}
		else
		{
			return [false, false];
		}
	}
	
	isDone()
	{
		return this.#index === this.notes.length;
	}
	
	getDegree()
	{
		return this.#index + 1;
	}
}

function randomMajorScale(baselineNoteNumber, degreeElement)
{
	let rootNoteNumber = baselineNoteNumber + getRandomIntInclusive(0,11);
	return new NoteSequence(getMajorScaleSequence(rootNoteNumber));
}

function generateMajorScale(rootNoteNumber)
{
	return new NoteSequence(getMajorScaleSequence(rootNoteNumber));
}

function getNoteName(noteNumber)
{
	let COffset = noteNumber % 12;
	return noteNameMap.get(COffset);
}

function getMajorChordNoteSet(noteNumber)
{
	return getChord(noteNumber, [0,4,7]);
}

function getMajorScaleSequence(noteNumber)
{
	return getScaleSequence(noteNumber, [0, 2, 4, 5, 7, 9, 11, 12]);
}

function getScaleSequence(noteNumber, intervals)
{
	let scale = [];
	for (interval of intervals)
	{
		scale.push(noteNumber + interval);
	}
	return scale;
}

function getChord(noteNumber, intervals)
{
	let chordNoteSet = new Set();
	for (interval of intervals)
	{
		chordNoteSet.add(noteNumber + interval);
	}
	return chordNoteSet;
}

function getNoteNumber(noteName, octave)
{
	return (octave + 1) * 12 + noteOffsetMap.get(noteName);
}

function sameSet(firstSet, secondSet)
{
	if (firstSet.size != secondSet.size)
	{
		return false;
	}
	for (let item of firstSet)
	{
		if (!secondSet.has(item))
		{
			return false;
		}
	}
	return true;
}

function handleNoteChange(e)
{
	let noteId = e.note.name + e.note.octave;
	console.log("Note change " + e.type + " " + noteId + " " + e.note.number);
	if (e.type == "noteon")
	{
		noteSet.add(e.note.number);
		if (mode === "scales")
		{
			let playScaleResult = scaleSequence.tryPlay(e.note.number);
			console.log(playScaleResult);
			if (scaleSequence.isDone())
			{
				scaleSequence = randomMajorScale(baselineNoteNumber, degreeElement);
				setRoot(scaleSequence.notes[0]);
			}
			else
			{
				degreeElement.textContent = scaleSequence.getDegree();
			}
		}
	} else if (e.type == "noteoff")
	{
		noteSet.delete(e.note.number);
	}
	console.log(noteSet);
	if (sameSet(noteSet, targetChord) || sameSet(noteSet, targetChord2))
	{
		numberCorrect++;
		numberCorrectElement.textContent = numberCorrect;
		targetChord = randomChord(majorChordDegrees);
		targetChord2 = transposeChord(targetChord, -12);
	}
}

function randomChord(chordDegrees)
{
	// -2 skips 7 dim
	let chordDegreeOffset = getRandomIntInclusive(0,chordDegrees.length - 2);
	let chordInfo = chordDegrees[chordDegreeOffset];
	chordDegreeElement.textContent = chordInfo.name;
	let intervals = chordQualityIntervalMap.get(chordInfo.quality);
	return getChord(scaleSequence.notes[chordDegreeOffset], intervals);
}

function onNoteOn(e)
{
	let noteId = e.note.name + e.note.octave;
	console.log("Received 'noteon' message (" + noteId + ").");
	noteSet.add(noteId);
	console.log(noteSet);
}

function onNoteOff(e)
{
	let noteId = e.note.name + e.note.octave;
	console.log("Received 'noteoff' message (" + noteId + ").");
	noteSet.delete(noteId);
	console.log(noteSet);
}

WebMidi.enable(function (err) {
	console.log(WebMidi.inputs);
	console.log(WebMidi.outputs);
	
	var input = WebMidi.inputs[0]; //WebMidi.getInputByName("Launchkey Mini MK3");

	input.addListener('noteon', "all", handleNoteChange);
	input.addListener('noteoff', "all", handleNoteChange);
});

function listInputsAndOutputs( midiAccess ) {
	for (var entry of midiAccess.inputs) {
		var input = entry[1];
		console.log( "Input port [type:'" + input.type + "'] id:'" + input.id +
		"' manufacturer:'" + input.manufacturer + "' name:'" + input.name +
		"' version:'" + input.version + "'" );
	}

	for (var entry of midiAccess.outputs) {
		var output = entry[1];
		console.log( "Output port [type:'" + output.type + "'] id:'" + output.id +
		"' manufacturer:'" + output.manufacturer + "' name:'" + output.name +
		"' version:'" + output.version + "'" );
	}
}

function onMIDISuccess( midiAccess ) {
	console.log( "MIDI ready!" );
	myMidi = midiAccess; 
	listInputsAndOutputs(midiAccess);
}

function onMIDIFailure(msg) {
	console.log( "Failed to get MIDI access - " + msg );
}

function setRoot(noteNumber)
{
	rootNoteNumber = noteNumber;
	rootElement.textContent = getNoteName(rootNoteNumber);
	degreeElement.textContent = 1;
}

function transposeChord(chord, semitoneChange)
{
	return new Set(Array.from(chord).map(n => n + semitoneChange));
}

let noteSet = new Set();

let mode = document.getElementById("mode").textContent;
let baselineNoteNumber = getNoteNumber("C", 3);
let rootNoteNumber = getNoteNumber("A", 3);

let rootElement = document.getElementById("root");
let degreeElement = document.getElementById("degree");
let chordDegreeElement = document.getElementById("chordDegree");
let numberCorrect = 0;
let numberCorrectElement = document.getElementById("numberCorrect");

setRoot(rootNoteNumber);
let scaleSequence = generateMajorScale(rootNoteNumber);
let targetChord = randomChord(majorChordDegrees);
let targetChord2 = transposeChord(-12);

function handleSetRoot()
{
	let rootSetting = document.getElementById("rootSetting").value;
	let rootSharpFlatSetting = document.getElementById("rootSharpFlatSetting").value;
	let rootNoteNumber = parseInt(rootSetting) + parseInt(rootSharpFlatSetting);
	setRoot(rootNoteNumber);
	scaleSequence = generateMajorScale(rootNoteNumber);
	targetChord = randomChord(majorChordDegrees);
	targetChord2 = transposeChord(-12);
}

if (mode === "chords")
{
	for( var id of ["rootSetting", "rootSharpFlatSetting"])
	{
		document.getElementById(id).addEventListener("change", handleSetRoot);
	}
}