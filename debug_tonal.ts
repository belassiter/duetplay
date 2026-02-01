import { Interval, Note } from 'tonal';

console.log("Interval.fromSemitones(1):", Interval.fromSemitones(1));
console.log("Interval.fromSemitones(12):", Interval.fromSemitones(12));
console.log("Interval.fromSemitones(-1):", Interval.fromSemitones(-1));

console.log("Note.transpose('C4', 'm2'):", Note.transpose('C4', 'm2'));
console.log("Note.transpose('C4', '2m'):", Note.transpose('C4', '2m'));

console.log("Note.transpose('C4', '-m2'):", Note.transpose('C4', '-m2'));
console.log("Note.transpose('C4', '-2m'):", Note.transpose('C4', '-2m'));

console.log("Interval.add('P1', '8P'):", Interval.add('P1', '8P'));
console.log("Interval.add('P1', 'P8'):", Interval.add('P1', 'P8'));
