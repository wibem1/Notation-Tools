# Notation Tools

Gemeinsame Browser-App für **ABC** und **LilyPond**.

## Version 0.1.0

Erster Integrationsstand:
- ein gemeinsamer Editor
- automatische Formaterkennung für ABC und LilyPond
- ABC-Notation über abcjs
- LilyPond-Notation über LilyPond/WASM
- gemeinsamer MIDI/SoundFont-Player
- Öffnen und Speichern von `.abc` und `.ly`

Die bestehenden Projekte ABC Tools und LilyPond Tools bleiben unverändert als Referenz und Wiederherstellungspunkte.

### Architektur

Die Formate bleiben nativ. Notation Tools konvertiert ABC nicht unnötig nach LilyPond und LilyPond nicht nach ABC:

`Quelle -> Formaterkennung -> ABC-Engine | LilyPond-Engine -> Partitur -> Player`
