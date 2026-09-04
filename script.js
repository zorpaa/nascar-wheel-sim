document.getElementById("runRace").addEventListener("click", runRace);

const startTracker={
    Cup:{},
    "O'Reilly":{},
    Truck:{}
};

function trackStarts(series,field){
    if(!startTracker[series]){
        startTracker[series]={};
    }

    field.forEach(driver=>{
        startTracker[series][driver.Driver]=
            (startTracker[series][driver.Driver]||0)+1;
    });

    console.log("=== START TRACKER ===");

    Object.entries(startTracker).forEach(([series,drivers])=>{
        console.log(`\n${series}`);

        Object.entries(drivers)
            .sort((a,b)=>b[1]-a[1])
            .forEach(([driver,starts])=>{
                console.log(`${driver}: ${starts}`);
            });
    });
}

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

function populateTrackList(){

    const trackSelect=document.getElementById("track");

    trackSelect.innerHTML="";

    Object.keys(tracks).forEach(track=>{

        const option=document.createElement("option");

        option.value=track;
        option.textContent=tracks[track].name;

        trackSelect.appendChild(option);

    });

}

function inverseWeightedPick(items,property){
    const totalWeight=items.reduce(
        (sum,item)=>sum+(1/item[property]),0
    );
    let random=Math.random()*totalWeight;
    for(const item of items){
        random-=1/item[property];
        if(random<=0)
            return item;
    }
    return items[items.length-1];
}

function selectFinishType(){
    return weightedPick(finishTypes,"weight").name;
}

function updateTrackFromRace(){

    const selectedSeries=document.getElementById("series").value;
    const raceSelect=document.getElementById("race");
    const trackSelect=document.getElementById("track");

    const scheduleKey=Object.keys(schedule).find(
        s=>s.toLowerCase().replace(/[’']/g,"") ===
           selectedSeries.toLowerCase().replace(/[’']/g,"")
    );

    if(!scheduleKey)
        return;

    const raceNumber=Number(raceSelect.value);

    const race=schedule[scheduleKey].find(
        r=>r.race===raceNumber
    );

    if(!race)
        return;

    trackSelect.value=race.track;
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

function getOpenCars(cars,count){

    let available=Object.entries(cars);
    let selected=[];

    while(selected.length<count && available.length){

        const options=available.map(([carID,carDrivers])=>({
            carID,
            drivers:carDrivers,
            weight:carDrivers[0]["Entry Weight"]
        }));

        const selectedCar=weightedPick(options,"weight");

        selected.push(selectedCar);

        available=available.filter(
            ([carID])=>carID!==selectedCar.carID
        );
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
            driver[header.trim()]=values[index]?.trim();
        });

        driver.Series=driver.Series.trim();
        driver.Number=driver.Number?.trim()||"";
        driver.Weight=Number(driver.Weight);
        driver["Entry Weight"]=Number(driver["Entry Weight"])||0;
        driver["Selection Weight"]=Number(driver["Selection Weight"])||0;
        driver.Chartered=driver.Chartered==="Yes";
        driver.Active=driver.Active==="Yes";
        driver.Specialty=driver.Specialty||"";

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

function selectDriverForCar(carDrivers,selectedDrivers=[]){
    const available=carDrivers.filter(driver=>
        !selectedDrivers.has(driver.Driver.trim().toLowerCase())
    );

    if(!available.length){
        return null;
    }

    if(available.length===1){
        return available[0];
    }

    const weighted=available.filter(
        driver=>driver["Selection Weight"]>0
    );

    if(!weighted.length){
        return available[Math.floor(Math.random()*available.length)];
    }

    const totalWeight=weighted.reduce(
        (sum,driver)=>sum+(1/driver["Selection Weight"]),0
    );

    let random=Math.random()*totalWeight;

    for(const driver of weighted){
        random-=1/driver["Selection Weight"];

        if(random<=0){
            return driver;
        }
    }

    return weighted[weighted.length-1];
}

function groupCars(drivers){

    const cars={};

    drivers.forEach(driver=>{

        const carID=driver["Car ID"] || `${driver.Driver}-${driver.Number}`;

        if(!cars[carID]){
            cars[carID]=[];
        }

        cars[carID].push(driver);

    });

    return cars;
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
document.getElementById("series").addEventListener("change",()=>{
    updateRaceList();
    updateTrackFromRace();
});

populateTrackList();
updateRaceList();
updateTrackFromRace();
updateRaceList();

function runRace(){
    document.getElementById("raceLog").textContent="";

    const selectedSeries=document.getElementById("series").value;
    const raceNumber=Number(document.getElementById("race").value);

    const scheduleKey=Object.keys(schedule).find(
        s=>s.toLowerCase().replace(/[’']/g,"")===
        selectedSeries.toLowerCase().replace(/[’']/g,"")
    );

    if(!scheduleKey){
        console.error("No schedule found for:",selectedSeries);
        return;
    }

    const race=schedule[scheduleKey].find(r=>r.race===raceNumber);

    if(!race){
        console.error("No race found:",raceNumber,selectedSeries);
        return;
    }

    const selectedTrack=race.track;

    console.log("Selected series:",selectedSeries);

    let allDrivers=drivers.filter(driver=>
        driver.Series.trim().toLowerCase().replace(/[’']/g,"")===
        selectedSeries.trim().toLowerCase().replace(/[’']/g,"")&&
        driver.Active
    );

    // Group drivers into cars
    const cars=groupCars(allDrivers);

    const charteredCars={};
    const uncharteredCars={};

    Object.entries(cars).forEach(([carID,carDrivers])=>{
        if(carDrivers[0].Chartered){
            charteredCars[carID]=carDrivers;
        }else{
            uncharteredCars[carID]=carDrivers;
        }
    });

    // Select chartered drivers
    let chartered=[];
    let selectedDrivers=new Set();

    const driver=selectDriverForCar(carDrivers,selectedDrivers);

    if(driver){
        chartered.push(driver);
        selectedDrivers.add(driver.Driver.trim().toLowerCase());
    }

     const driver=selectDriverForCar(car.drivers,selectedDrivers);

    if(driver){
        openDrivers.push(driver);
        selectedDrivers.add(driver.Driver.trim().toLowerCase());
    }
    
    Object.values(charteredCars).forEach(carDrivers=>{
        chartered.push(selectDriverForCar(carDrivers));
    });

    // Select open cars
    let openCount=selectOpenEntries(selectedSeries);
    let openCars=getOpenCars(uncharteredCars,openCount);

    // Select driver for each open car
    let openDrivers=openCars.map(car=>
        selectDriverForCar(car.drivers)
    );

    addLog(`Series: ${selectedSeries}`);
    addLog("");
    addLog(`Open Entries Selected: ${openDrivers.length}`);

    openDrivers.forEach(driver=>{
        addLog(`✓ #${driver.Number} ${driver.Driver}`);
    });

    addLog("");

    document.getElementById("openList").textContent=
        openDrivers.length
        ?"Open Cars: "+openDrivers.map(d=>`#${d.Number} ${d.Driver}`).join(", ")
        :"Open Cars: None";

    // Final field
    let field=[
        ...chartered,
        ...openDrivers
    ];

    trackStarts(selectedSeries,field);

    const names=field.map(d=>d.Driver.trim().toLowerCase());
    const duplicates=names.filter(
        (name,index)=>names.indexOf(name)!==index
    );
    
    if(duplicates.length){
        console.error("⚠️ DUPLICATE DRIVER DETECTED:",[...new Set(duplicates)]);
    }
    
    console.log(field);
    console.log("Chartered Cars:",Object.keys(charteredCars).length);
    console.log("Unchartered Cars:",Object.keys(uncharteredCars).length);
    console.log("Final Field:",field.length);

    const results=generateResults(field,selectedTrack);
    const finishType=selectFinishType();

    addLog("Generating finishing order...");
    addLog("");

    results.forEach((driver,index)=>{
        addLog(`${index+1}. #${driver.Number} ${driver.Driver}`);
    });

    document.getElementById("fieldSize").textContent=
        `Field Size: ${field.length}`;

    addLog(`Track: ${selectedTrack}`);
    addLog(`Type: ${tracks[selectedTrack].type}`);

    document.getElementById("openEntries").textContent=
        `Open Entries: ${openDrivers.length}`;

    console.log("Open entries:",openDrivers);
    console.log("Field size:",field.length);

    // Results table
    const table=document.getElementById("resultsTable");
    table.innerHTML="";

    results.forEach((driver,index)=>{
        let row=document.createElement("tr");

        row.innerHTML=`
            <td>${index+1}</td>
            <td>${driver.Number}</td>
            <td>${driver.Driver}</td>
            <td>${driver.Team}</td>
        `;

        table.appendChild(row);
    });
    
    // Update race information
    updateRaceList();
    updateTrackFromRace();

    document.getElementById("trackType").textContent=
        tracks[selectedTrack].type;

    document.getElementById("raceName").textContent=race.name;
    document.getElementById("trackName").textContent=selectedTrack;

    // Winner card
    document.getElementById("winnerCard").classList.remove("hidden");
    document.getElementById("winnerName").textContent=results[0].Driver;
    document.getElementById("winnerTeam").textContent=results[0].Team;
    document.getElementById("winnerNumber").textContent=results[0].Number;
    document.getElementById("finishType").textContent=finishType;
}
