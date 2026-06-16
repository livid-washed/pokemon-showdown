import { RandomTeams } from '../gen9/teams';

export class RandomChampionsTeams extends RandomTeams {
	rentalSets: { [species: string]: RandomTeamsTypes.RentalData } = require('./rental-data.json');

	randomRentalTeam(): RandomTeamsTypes.RandomSet[] {
		this.enforceNoDirectCustomBanlistChanges();

		const team = [];

		const natures = this.dex.natures.all();

		const isMonotype = !!this.forceMonotype || this.dex.formats.getRuleTable(this.format).has('sametypeclause');
		const typePool = this.dex.types.names().filter(name => name !== "Stellar");
		const type = isMonotype ? this.forceMonotype || this.sample(typePool) : undefined;

		const pokemonList = Object.keys(this.rentalSets);

		while (team.length < this.maxTeamSize) {
			const pokemonName = this.sampleNoReplace(pokemonList);
			const species = this.dex.species.get(pokemonName);
			if (type && !species.types.includes(type)) continue;
			// No item, unless the Pokemon can mega evolve, in which case give it a random usable mega stone
			let item = '';
			if (species.otherFormes) {
				const megas = [];
				for (const forme of species.otherFormes) {
					const potentialMega = this.dex.species.get(forme);
					if (potentialMega.isNonstandard) continue;
					if (!potentialMega.forme.includes("Mega")) continue;
					if (!potentialMega.requiredItem) continue;
					megas.push(potentialMega)
				}
				if (megas.length) item = this.sample(megas).requiredItem!;
			}
			// Random legal ability
			const abilities = Object.values(species.abilities).filter(a => a !== species.abilities.S);
			const ability: string = this.sample(abilities);
			const moves: string[] = [];
			if (this.rentalSets[pokemonName]["flagshipMove"]) moves.push(this.rentalSets[pokemonName]["flagshipMove"]);
			if (this.rentalSets[pokemonName]["secondaryMove"]) moves.push(this.rentalSets[pokemonName]["secondaryMove"]);
			if (this.rentalSets[pokemonName]["otherMoves"]) {
				const otherMoves = [];
				for (const movename of this.rentalSets[pokemonName]["otherMoves"]) {
					otherMoves.push(movename);
				}
				while (moves.length < this.maxMoveCount && otherMoves.length) {
					moves.push(this.sampleNoReplace(otherMoves));
				}
			}

			// EVs
			const evs: StatsTable = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
			const stats: StatID[] = ["hp", "atk", "def", "spa", "spd", "spe"];
			const nonOffensiveStats: StatID[] = ["hp", "def", "spd", "spe"];

			// If the first move is a Physical/Special move, the Pokemon will have full investment (32) in atk/spa, otherwise full investment in another stat
			const firstMove = this.dex.moves.get(moves[0]);
			if (firstMove.category === 'Physical') evs["atk"] = 32;
			if (firstMove.category === 'Special') evs["spa"] = 32;
			if (firstMove.category === 'Status') evs[this.sample(nonOffensiveStats)] = 32;

			// Now, full investment in a non-offensive stat that doesn't already have full investment
			evs[this.sample(nonOffensiveStats.filter(s => evs[s] === 0))] = 32;

			// Finally, invest the final 2 stat points elsewhere. Investment in atk/spa is only allowed if it has a move of that category
			// Find the allowed stats first, then choose one randomly
			const hasPhysicalMove = moves.some(m => this.dex.moves.get(m).category === 'Physical');
			const hasSpecialMove = moves.some(m => this.dex.moves.get(m).category === 'Special');

			const allowedStats = nonOffensiveStats.filter(s => evs[s] === 0);
			if (hasPhysicalMove && evs["atk"] === 0) allowedStats.push("atk");
			if (hasSpecialMove && evs["spa"] === 0) allowedStats.push("spa");

			evs[this.sample(allowedStats)] = 2;

			// Random IVs
			const ivs = {
				hp: 31,
				atk: 31,
				def: 31,
				spa: 31,
				spd: 31,
				spe: 31,
			};

			// Natures
			// The nature always increases a stat with max investment and decreases a stat with no investment
			const increasedStat = this.sample(stats.filter(s => s !== "hp" && evs[s] === 32));
			const decreasedStat = this.sample(stats.filter(s => s !== "hp" && evs[s] === 0));

			let nature = this.sample(natures).name;

			// Find the nature that increases and decreases the correct stats
			for (const n of natures) {
				if (increasedStat === n.plus && decreasedStat === n.minus) nature = n.name;
			}

			const level = this.adjustLevel || 50;

			const happiness = 255;

			// Random shininess
			const shiny = this.randomChance(1, 1024);
			const set: RandomTeamsTypes.RandomSet = {
				name: species.baseSpecies,
				species: species.name,
				gender: species.gender || (this.random(2) ? 'F' : 'M'),
				item,
				ability,
				moves,
				evs,
				ivs,
				nature,
				level,
				happiness,
				shiny,
			};
			team.push(set);
		}
		return team;
	}
}

export default RandomChampionsTeams;
