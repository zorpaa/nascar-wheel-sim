document.getElementById("runRace").addEventListener("click", runRace);

const finishTypes = [
    {type:"Normal Finish",weight:80},
    {type:"Side-by-Side Finish",weight:12},
    {type:"Photo Finish",weight:5},
    {type:"Last Lap Pass",weight:3}
];

const openEntryOdds = {
    Cup: [
        {number:0, weight:20},
        {number:1, weight:35},
        {number:2, weight:25},
        {number:3, weight:12},
        {number:4, weight:6},
        {number:5, weight:2},
        {number:6, weight:1}
    ],

    "O'Reilly": [
        {number:0, weight:15},
        {number:1, weight:30},
        {number:2, weight:30},
        {number:3, weight:15},
        {number:4, weight:7},
        {number:5, weight:2},
        {number:6, weight:1}
    ],

    Truck: [
        {number:0, weight:10},
        {number:1, weight:25},
        {number:2, weight:35},
        {number:3, weight:20},
        {number:4, weight:7},
        {number:5, weight:2},
        {number:6, weight:1}
    ]
};

function addLog(message){
    const log=document.getElementById("raceLog");
    log.textContent += message + "\n";
}

function getFinishType(){
    return weightedPick(
        finishTypes,
        "weight"
    ).type;

}

function selectOpenEntries(series){
    let cleanSeries = series
        .toLowerCase()
        .replace(/[’']/g,"");
    let key = Object.keys(openEntryOdds).find(
        s => s.toLowerCase().replace(/[’']/g,"") === cleanSeries
    );
    let options = openEntryOdds[key];
    let count = weightedPick(options,"weight").number;
    return count;
}

function getOpenDrivers(drivers,count){
    let available=[...drivers];
    let selected=[];
    while(selected.length<count && available.length){
        let driver=weightedPick(available,"Entry Weight");
        selected.push(driver);
        available=available.filter(d=>d!==driver);
    }
    return selected;
}

function getAdjustedWeight(driver,track){
    let weight=driver.Weight;
    if(!tracks[track])
        return weight;
    if(!driver.Specialty)
        return weight;
    let specialties=driver.Specialty
        .split(",")
        .map(s=>s.trim());
    if(specialties.includes(tracks[track].type)){
        weight*=0.85;
    }
    return weight;
}

let drivers = [];

fetch("data/drivers.csv")
.then(response => response.text())
.then(data => {
    drivers = parseCSV(data);
    console.log("Loaded drivers:", drivers);
});


function parseCSV(data){

    const rows=data.trim().split("\n");

    const headers=rows[0].split(",");

    return rows.slice(1).map(row=>{

        const values=row.split(",");

        let driver={};

        headers.forEach((header,index)=>{

            driver[header.trim()] = values[index]?.trim();

        });

        driver.Series = driver.Series.trim();
        driver.Weight=Number(driver.Weight);
        driver["Entry Weight"]=Number(driver["Entry Weight"]) || 0;
        driver.Chartered=driver.Chartered.trim().toLowerCase()==="yes";
        driver.Active=driver.Active.trim().toLowerCase()==="yes";
        driver.Specialty = driver.Specialty || "";
        return driver;

    });

}

// STEP 2
function weightedPick(drivers, property){

    const totalWeight = drivers.reduce((sum,d)=>sum+d[property],0);

    let random = Math.random()*totalWeight;

    for(const driver of drivers){

        random -= driver[property];

        if(random<=0)
            return driver;

    }

    return drivers[drivers.length-1];

}

function generateResults(field,track){
    let remaining=[...field];
    let results=[];
    while(remaining.length){
        let weightedDrivers = remaining.map(driver=>({
            ...driver,
            AdjustedWeight:getAdjustedWeight(driver,track)
        }));
        const picked=weightedPick(
            weightedDrivers,
            "AdjustedWeight"
        );
        results.unshift(picked);
        remaining=remaining.filter(
            d=>d.Driver!==picked.Driver
        );
    }
    return results;
}

function updateRaceList(){
    const selectedSeries=document.getElementById("series").value;
    const raceSelect=document.getElementById("race");
    raceSelect.innerHTML="";
    const scheduleKey=Object.keys(schedule).find(
        s=>s.toLowerCase().replace(/[’']/g,"") ===
           selectedSeries.toLowerCase().replace(/[’']/g,"")
    );
    if(!scheduleKey)
        return;
    schedule[scheduleKey].forEach(race=>{
        const option=document.createElement("option");
        option.value=race.race;
        option.textContent=`${race.race}. ${race.name}`;
        raceSelect.appendChild(option);
    });
}
document.getElementById("series").addEventListener("change",updateRaceList);
updateRaceList();

function runRace(){
    document.getElementById("raceLog").textContent="";
    const selectedSeries=document.getElementById("series").value;
    const raceNumber=Number(
        document.getElementById("race").value
    );

    const scheduleKey=Object.keys(schedule).find(
    s=>s.toLowerCase().replace(/[’']/g,"") ===
       selectedSeries.toLowerCase().replace(/[’']/g,"")
);

if(!scheduleKey){
    console.error("No schedule found for:",selectedSeries);
    return;
}

const race=schedule[scheduleKey].find(
    r=>r.race===raceNumber
);

if(!race){
    console.error("No race found:",raceNumber,selectedSeries);
    return;
}

const selectedTrack=race.track;
    console.log("Selected series:", selectedSeries);
    let allDrivers = drivers.filter(driver =>
    driver.Series
        .trim()
        .toLowerCase()
        .replace(/[’']/g,"") === 
    selectedSeries
        .trim()
        .toLowerCase()
        .replace(/[’']/g,"") &&
    driver.Active
);

    let chartered = allDrivers.filter(driver => driver.Chartered);

    let unchartered = allDrivers.filter(driver => !driver.Chartered);

    let openCount = selectOpenEntries(selectedSeries);

    let openDrivers = getOpenDrivers(unchartered,openCount);

    addLog(`Series: ${selectedSeries}`);
    addLog("");
    addLog(`Open Entries Selected: ${openDrivers.length}`);
    openDrivers.forEach(driver=>{
        addLog("✓ " + driver.Driver);
    });
    addLog("");
    
    document.getElementById("openList").textContent =
        openDrivers.length
        ? "Open Cars: " + openDrivers.map(d=>d.Driver).join(", ")
        : "Open Cars: None";

    let field = [
        ...chartered,
        ...openDrivers
    ];

    console.log(field);
    console.log("Chartered:", chartered.length);
    console.log("Unchartered:", unchartered.length);
    console.log("Final field:", field.length);
    const results=generateResults(field,selectedTrack);

    addLog("Generating finishing order...");
    addLog("");

    results.forEach((driver,index)=>{

        addLog(
            `${index+1}. ${driver.Driver}`
        );

    });

    document.getElementById("fieldSize").textContent =
    `Field Size: ${field.length}`;
    addLog(`Track: ${selectedTrack}`);
    addLog(`Type: ${tracks[selectedTrack].type}`);
    document.getElementById("openEntries").textContent =
    `Open Entries: ${openDrivers.length}`;
    
    console.log("Open entries:",openDrivers);
    console.log("Field size:",field.length);
    
    const table=document.getElementById("resultsTable");

table.innerHTML="";


results.forEach((driver,index)=>{

    let row=document.createElement("tr");

    row.innerHTML=`
        <td>${index+1}</td>
        <td>${driver.Driver}</td>
        <td>${driver.Team}</td>
    `;

    table.appendChild(row);

});

    document.getElementById("raceName").textContent=race.name;
    document.getElementById("trackName").textContent=selectedTrack;
    document.getElementById("winnerCard").classList.remove("hidden");
    document.getElementById("winnerName").textContent=results[0].Driver;
    document.getElementById("winnerTeam").textContent=results[0].Team;
    document.getElementById("finishType").textContent =
    getFinishType();
}
