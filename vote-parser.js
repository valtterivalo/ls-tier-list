// vote-parser.js
const fs = require('fs');

// Champion data mapping (we'll need to map names to IDs)
// This would ideally come from your database, but we'll create a simple mapping here
// You may need to adjust this based on your actual champion IDs in the database
const championMap = {};
let nextId = 1;

// Parse vote data
function parseVoteData(rawData, role) {
  const lines = rawData.trim().split('\n');
  
  // Skip header line
  const dataLines = lines.slice(1);
  
  const votes = [];
  
  for (const line of dataLines) {
    // Split by tabs or multiple spaces
    const parts = line.trim().split(/\s{2,}|\t/);
    
    if (parts.length < 4) continue;
    
    // Extract champion name, might contain spaces
    let champion = parts[0];
    
    // Handle cases where champion name has spaces and got split
    let i = 1;
    while (i < parts.length - 3) {
      champion += ' ' + parts[i];
      i++;
    }
    champion = champion.trim();
    
    // Get or create an ID for this champion
    if (!championMap[champion]) {
      championMap[champion] = nextId++;
    }
    
    // Extract votes
    const votePart = parts[parts.length - 1];
    const [upvotes, totalVotes] = votePart.split('/').map(Number);
    // Calculate downvotes as the difference between total votes and upvotes
    const downvotes = totalVotes - upvotes;
    
    votes.push({
      name: champion,
      champion_id: championMap[champion],
      role: role,
      upvotes: upvotes,
      downvotes: downvotes
    });
  }
  
  return votes;
}

// Parse each role's data
const topVotes = `
Champion	Tier	Score	Votes
Jayce	B	0.604	5/6
Heimerdinger	B	0.590	3/3
Kayle	B	0.590	3/3
Yone	B	0.590	3/3
Aatrox	B	0.578	4/5
Ambessa	B	0.548	3/4
Irelia	B	0.548	3/4
Singed	B	0.515	1/1
Urgot	B	0.515	1/1
Gwen	B	0.513	2/3
Illaoi	B	0.513	2/3
K'Sante	B	0.513	2/3
Fiora	B	0.476	2/4
Camille	B	0.472	1/2
Cho'Gath	B	0.472	1/2
Dr. Mundo	B	0.472	1/2
Garen	B	0.472	1/2
Gnar	B	0.472	1/2
Jax	B	0.472	1/2
Mordekaiser	B	0.472	1/2
Olaf	B	0.472	1/2
Nasus	B	0.424	0/1
Ornn	C	0.424	0/1
Quinn	C	0.424	0/1
Renekton	C	0.424	0/1
Riven	C	0.424	0/1
Rumble	C	0.424	0/1
Sett	C	0.424	0/1
Shen	C	0.424	0/1
Sion	C	0.424	0/1
Tahm Kench	C	0.424	0/1
Teemo	C	0.424	0/1
Trundle	C	0.424	0/1
Tryndamere	C	0.424	0/1
Vladimir	C	0.424	0/1
Warwick	C	0.424	0/1
Yorick	C	0.424	0/1
Volibear	C	0.424	0/1
Darius	C	0.389	0/2
Gangplank	C	0.389	0/2
Gragas	C	0.389	0/2
Kennen	C	0.389	0/2
Kled	C	0.389	0/2
Malphite	C	0.389	0/2
Pantheon	C	0.389	0/2
`;

const jungleVotes = `
Champion	Tier	Score	Votes
Amumu	B	0.592	2/2
Hecarim	B	0.592	2/2
Kindred	B	0.578	3/4
Briar	B	0.554	1/1
Elise	B	0.554	1/1
Fiddlesticks	B	0.554	1/1
Graves	B	0.554	1/1
Ivern	B	0.554	1/1
Jarvan IV	B	0.554	1/1
Kha'Zix	B	0.554	1/1
Lillia	B	0.554	1/1
Rammus	B	0.554	1/1
Rek'Sai	B	0.554	1/1
Sejuani	B	0.554	1/1
Vi	B	0.554	1/1
Lee Sin	B	0.546	2/3
Bel'Veth	B	0.510	0/0
Gragas	B	0.510	0/0
Diana	B	0.508	1/2
Kayn	B	0.508	1/2
Shaco	C	0.508	1/2
Warwick	C	0.508	1/2
Skarner	C	0.508	1/2
Ekko	C	0.463	0/1
Evelynn	C	0.463	0/1
Karthus	C	0.463	0/1
Master Yi	C	0.463	0/1
Wukong	C	0.463	0/1
Nidalee	C	0.463	0/1
Nocturne	C	0.463	0/1
Nunu & Willump	C	0.463	0/1
Pantheon	C	0.463	0/1
Rengar	C	0.463	0/1
Shyvana	C	0.463	0/1
Talon	C	0.463	0/1
Udyr	C	0.463	0/1
Viego	C	0.463	0/1
Xin Zhao	C	0.463	0/1
Zac	C	0.463	0/1
Zyra	C	0.463	0/1
Volibear	C	0.463	0/1
`;

// Add data for other roles here (Mid, ADC, Support)
const midVotes = `
Champion	Tier	Score	Votes
Irelia	B	0.841	4/4
Yasuo	B	0.841	4/4
Zed	B	0.841	4/4
Hwei	B	0.829	3/3
Syndra	B	0.829	3/3
Ahri	B	0.815	2/2
Mel	B	0.815	2/2
Anivia	B	0.798	1/1
Annie	B	0.798	1/1
Aurelion Sol	B	0.798	1/1
Aurora	B	0.798	1/1
Cassiopeia	B	0.798	1/1
Diana	B	0.798	1/1
Ekko	B	0.798	1/1
Galio	B	0.798	1/1
Kassadin	B	0.798	1/1
Katarina	B	0.798	1/1
LeBlanc	B	0.798	1/1
Lissandra	B	0.798	1/1
Lux	B	0.798	1/1
Malzahar	C	0.798	1/1
Orianna	C	0.798	1/1
Twisted Fate	C	0.798	1/1
Vex	C	0.798	1/1
Viktor	C	0.798	1/1
Vladimir	C	0.798	1/1
Zoe	C	0.798	1/1
Fizz	C	0.731	1/2
Ryze	C	0.731	1/2
Akali	C	0.731	1/2
Sylas	C	0.731	1/2
Taliyah	C	0.731	1/2
Talon	C	0.731	1/2
Yone	C	0.731	1/2
Azir	C	0.707	0/1
Qiyana	C	0.707	0/1
Veigar	C	0.707	0/1
Akshan	C	0.707	0/1
Xerath	C	0.707	0/1
Naafiri	C	0.648	0/2
`;

const adcVotes = `
Champion	Tier	Score	Votes
Jinx	B	0.893	3/3
Aphelios	B	0.884	2/2
Draven	B	0.884	2/2
Ezreal	B	0.884	2/2
Samira	B	0.884	2/2
Twitch	B	0.884	2/2
Vayne	B	0.884	2/2
Ashe	B	0.873	1/1
Corki	B	0.873	1/1
Kai'Sa	B	0.873	1/1
Kalista	B	0.873	1/1
Kog'Maw	B	0.873	1/1
Mel	C	0.873	1/1
Miss Fortune	C	0.873	1/1
Nilah	C	0.873	1/1
Sivir	C	0.873	1/1
Smolder	C	0.873	1/1
Tristana	C	0.873	1/1
Xayah	C	0.860	0/0
Zeri	C	0.840	4/5
Caitlyn	C	0.816	2/3
Varus	C	0.816	2/3
Jhin	C	0.800	1/2
Lucian	C	0.800	1/2
Ziggs	C	0.800	1/2
`;

const supportVotes = `
Champion	Tier	Score	Votes
Bard	B	0.848	1/1
Brand	B	0.848	1/1
Braum	B	0.848	1/1
Elise	B	0.848	1/1
Karma	B	0.848	1/1
Lux	B	0.848	1/1
Maokai	B	0.848	1/1
Mel	B	0.848	1/1
Morgana	B	0.848	1/1
Neeko	B	0.848	1/1
Pantheon	B	0.848	1/1
Poppy	B	0.848	1/1
Pyke	B	0.848	1/1
Rakan	B	0.848	1/1
Rell	B	0.848	1/1
Renata Glasc	B	0.848	1/1
Senna	B	0.848	1/1
Seraphine	B	0.848	1/1
Sona	C	0.848	1/1
Soraka	C	0.848	1/1
Swain	C	0.848	1/1
Tahm Kench	C	0.848	1/1
Taric	C	0.848	1/1
Thresh	C	0.848	1/1
Vel'Koz	C	0.848	1/1
Xerath	C	0.848	1/1
Yuumi	C	0.848	1/1
Zilean	C	0.848	1/1
Zyra	C	0.848	1/1
Alistar	C	0.848	1/1
Janna	C	0.833	0/0
Blitzcrank	C	0.758	0/1
Leona	C	0.758	0/1
Lulu	C	0.758	0/1
Milio	C	0.758	0/1
Nami	C	0.758	0/1
Nautilus	C	0.758	0/1
`;

// Parse each role
const allVotes = [
  ...parseVoteData(topVotes, 'Top'),
  ...parseVoteData(jungleVotes, 'Jungle'),
  ...parseVoteData(midVotes, 'Mid'),
  ...parseVoteData(adcVotes, 'ADC'),
  ...parseVoteData(supportVotes, 'Support')
];

// Write the results to a JSON file
fs.writeFileSync('vote-import.json', JSON.stringify(allVotes, null, 2));
console.log(`Created vote-import.json with ${allVotes.length} vote entries`);