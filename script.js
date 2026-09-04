document.getElementById("runRace").addEventListener("click",runRace);

const startTracker={
    Cup:{},
    "O'Reilly":{},
    Truck:{}
};

function trackStarts(series,field){
    if(!startTracker[series])
        startTracker[series]={};

    field.forEach(driver=>{
        const name=driver.Driver.trim().toLowerCase();
        const displayName=driver.Driver.trim();

        if(!startTracker[series][name]){
            startTracker[series][name]={
                name:displayName,
                starts:0
            };
        }

        startTracker[series][name].starts++;
    });

    console.log("=== START TRACKER ===");

    Object.entries(startTracker).forEach(([series,drivers])=>{
        console.log(`\n${series}`);

        Object.values(drivers)
            .sort((a,b)=>b.starts-a.starts)
            .forEach(driver=>{
                console.log(`${driver.name}: ${driver.starts}`);
            });
    });
}

const openEntryOdds={
    Cup:[
        {number:0,weight:20},
        {number:1,weight:35},
        {number:2,weight:25},
        {number:3,weight:12},
        {number:4,weight:6},
        {number:5,weight:2},
        {number:6,weight:1}
    ],

    "O'Reilly":[
        {number:0,weight:15},
        {number:1,weight:30},
        {number:2,weight:30},
        {number:3,weight:15},
        {number:4,weight:7},
        {number:5,weight:2},
        {number:6,weight:1}
    ],

    Truck:[
        {number:0,weight:10},
        {number:1,weight:25},
        {number:2,weight:35},
        {number:3,weight:20},
        {number:4,weight:7},
        {number:5,weight:2},
        {number:6,weight:1}
    ]
};

function addLog(message){
    document.getElementById("raceLog").textContent+=message+"\n";
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

function weightedPick(items,property){
    if(!items.length)
        return null;

    const totalWeight=items.reduce(
        (sum,item)=>sum+item[property],0
    );

    if(totalWeight<=0)
        return items[Math.floor(Math.random()*items.length)];

    let random=Math.random()*totalWeight;

    for(const item of items){
        random-=item[property];

        if(random<=0)
            return item;
    }

    return items[items.length-1];
}

function inverseWeightedPick(items,property){
    const valid=items.filter(item=>item[property]>0);

    if(!valid.length)
        return items[Math.floor(Math.random()*items.length)];

    const totalWeight=valid.reduce(
        (sum,item)=>sum+(1/item[property]),0
    );

    let random=Math.random()*totalWeight;

    for(const item of valid){
        random-=1/item[property];

        if(random<=0)
            return item;
    }

    return valid[valid.length-1];
}

function selectFinishType(){
    const selected=weightedPick(finishTypes,"weight");
    return selected?.type||selected?.name||"";
}

function updateTrackFromRace(){
    const selectedSeries=document.getElementById("series").value;
    const raceSelect=document.getElementById("race");
    const trackSelect=document.getElementById("track");

    const scheduleKey=Object.keys(schedule).find(
        s=>s.toLowerCase().replace(/[’']/g,"")===
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

function selectOpenEntries(series){
    const cleanSeries=series
        .toLowerCase()
        .replace(/[’']/g,"");

    const key=Object.keys(openEntryOdds).find(
        s=>s.toLowerCase().replace(/[’']/g,"")===cleanSeries
    );

    if(!key)
        return 0;

    const selected=weightedPick(openEntryOdds[key],"weight");

    return selected?.number||0;
}

function getOpenCars(cars,count){
    let available=Object.entries(cars);
    const selected=[];

    while(selected.length<count&&available.length){
        const options=available.map(([carID,carDrivers])=>({
            carID,
            drivers:carDrivers,
            weight:carDrivers[0]["Entry Weight"]
        }));

        const selectedCar=weightedPick(options,"weight");

        if(!selectedCar)
            break;

        selected.push(selectedCar);

        available=available.filter(
            ([carID])=>carID!==selectedCar.carID
        );
    }

    return selected;
}

function getAdjustedWeight(driver,track){
    let weight=driver.Weight;

    if(!tracks[track]||!driver.Specialty)
        return weight;

    const specialties=driver.Specialty
        .split(",")
        .map(s=>s.trim());

    if(specialties.includes(tracks[track].type))
        weight*=0.85;

    return weight;
}

let drivers=[];

fetch("data/drivers.csv")
.then(response=>response.text())
.then(data=>{
    drivers=parseCSV(data);
    console.log("Loaded drivers:",drivers);
});

function parseCSV(data){
    const rows=data.trim().split("\n");
    const headers=rows[0].split(",");

    return rows.slice(1).map(row=>{
        const values=row.split(",");
        const driver={};

        headers.forEach((header,index)=>{
            driver[header.trim()]=values[index]?.trim();
        });

        driver.Series=driver.Series?.trim()||"";
        driver.Number=driver.Number?.trim()||"";
        driver.Weight=Number(driver.Weight)||0;
        driver["Entry Weight"]=Number(driver["Entry Weight"])||0;
        driver["Selection Weight"]=Number(driver["Selection Weight"])||0;
        driver.Chartered=driver.Chartered==="Yes";
        driver.Active=driver.Active==="Yes";
        driver.Specialty=driver.Specialty||"";

        return driver;
    });
}

function selectDriverForCar(carDrivers,selectedDrivers){
    const available=carDrivers.filter(driver=>{
        const name=driver.Driver.trim().toLowerCase();
        return !selectedDrivers.has(name);
    });

    if(!available.length)
        return null;

    if(available.length===1)
        return available[0];

    const weighted=available.filter(
        driver=>driver["Selection Weight"]>0
    );

    if(!weighted.length)
        return available[Math.floor(Math.random()*available.length)];

    const selected=inverseWeightedPick(
        weighted,
        "Selection Weight"
    );

    return selected;
}

function groupCars(drivers){
    const cars={};

    drivers.forEach(driver=>{
        const carID=
            driver["Car ID"]||
            `${driver.Driver}-${driver.Number}`;

        if(!cars[carID])
            cars[carID]=[];

        cars[carID].push(driver);
    });

    return cars;
}

function generateResults(field,track){
    let remaining=[...field];
    const results=[];

    while(remaining.length){
        const weightedDrivers=remaining.map(driver=>({
            ...driver,
            AdjustedWeight:getAdjustedWeight(driver,track)
        }));

        const picked=weightedPick(
            weightedDrivers,
            "AdjustedWeight"
        );

        if(!picked)
            break;

        results.unshift(picked);

        const pickedName=picked.Driver.trim().toLowerCase();

        remaining=remaining.filter(
            driver=>driver.Driver.trim().toLowerCase()!==pickedName
        );
    }

    return results;
}

function updateRaceList(){
    const selectedSeries=document.getElementById("series").value;
    const raceSelect=document.getElementById("race");

    raceSelect.innerHTML="";

    const scheduleKey=Object.keys(schedule).find(
        s=>s.toLowerCase().replace(/[’']/g,"")===
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

document.getElementById("race").addEventListener(
    "change",
    updateTrackFromRace
);

populateTrackList();
updateRaceList();
updateTrackFromRace();

function runRace(){
    document.getElementById("raceLog").textContent="";

    const selectedSeries=document.getElementById("series").value;
    const raceNumber=Number(
        document.getElementById("race").value
    );

    const scheduleKey=Object.keys(schedule).find(
        s=>s.toLowerCase().replace(/[’']/g,"")===
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
        console.error(
            "No race found:",
            raceNumber,
            selectedSeries
        );
        return;
    }

    const selectedTrack=race.track;

    console.log("Selected series:",selectedSeries);

    const allDrivers=drivers.filter(driver=>
        driver.Series.trim().toLowerCase().replace(/[’']/g,"")===
        selectedSeries.trim().toLowerCase().replace(/[’']/g,"")&&
        driver.Active
    );

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

    // Track drivers already assigned this race
    const selectedDrivers=new Set();

    // Select one driver for every chartered car
    const chartered=[];

    Object.values(charteredCars).forEach(carDrivers=>{
        const selectedDriver=
            selectDriverForCar(
                carDrivers,
                selectedDrivers
            );

        if(selectedDriver){
            chartered.push(selectedDriver);

            selectedDrivers.add(
                selectedDriver.Driver.trim().toLowerCase()
            );
        }
    });

    // Select unchartered cars
    const openCount=selectOpenEntries(selectedSeries);

    const openCars=getOpenCars(
        uncharteredCars,
        openCount
    );

    // Select one driver for every selected open car
    const openDrivers=[];

    openCars.forEach(car=>{
        const selectedDriver=
            selectDriverForCar(
                car.drivers,
                selectedDrivers
            );

        if(selectedDriver){
            openDrivers.push(selectedDriver);

            selectedDrivers.add(
                selectedDriver.Driver.trim().toLowerCase()
            );
        }
    });

    addLog(`Series: ${selectedSeries}`);
    addLog("");
    addLog(`Open Entries Selected: ${openDrivers.length}`);

    openDrivers.forEach(driver=>{
        addLog(
            `✓ #${driver.Number} ${driver.Driver}`
        );
    });

    addLog("");

    document.getElementById("openList").textContent=
        openDrivers.length
        ?`Open Cars: ${openDrivers.map(
            d=>`#${d.Number} ${d.Driver}`
        ).join(", ")}`
        :"Open Cars: None";

    // Final field
    const field=[
        ...chartered,
        ...openDrivers
    ];

    // Track starts
    trackStarts(selectedSeries,field);

    // Duplicate safety check
    const names=field.map(
        driver=>driver.Driver.trim().toLowerCase()
    );

    const duplicates=names.filter(
        (name,index)=>names.indexOf(name)!==index
    );

    if(duplicates.length){
        console.error(
            "⚠️ DUPLICATE DRIVER DETECTED:",
            [...new Set(duplicates)]
        );
    }else{
        console.log("✓ No duplicate drivers");
    }

    console.log("Chartered Cars:",Object.keys(charteredCars).length);
    console.log("Unchartered Cars:",Object.keys(uncharteredCars).length);
    console.log("Final Field:",field.length);
    console.log("Final Field:",field);

    // Generate results
    const results=generateResults(
        field,
        selectedTrack
    );

    const finishType=selectFinishType();

    addLog("Generating finishing order...");
    addLog("");

    results.forEach((driver,index)=>{
        addLog(
            `${index+1}. #${driver.Number} ${driver.Driver}`
        );
    });

    document.getElementById("fieldSize").textContent=
        `Field Size: ${field.length}`;

    addLog(`Track: ${selectedTrack}`);

    if(tracks[selectedTrack]){
        addLog(
            `Type: ${tracks[selectedTrack].type}`
        );
    }

    document.getElementById("openEntries").textContent=
        `Open Entries: ${openDrivers.length}`;

    console.log("Open entries:",openDrivers);
    console.log("Field size:",field.length);

    // Results table
    const table=document.getElementById("resultsTable");
    table.innerHTML="";

    results.forEach((driver,index)=>{
        const row=document.createElement("tr");

        row.innerHTML=`
            <td>${index+1}</td>
            <td>${driver.Number}</td>
            <td>${driver.Driver}</td>
            <td>${driver.Team}</td>
        `;

        table.appendChild(row);
    });

    // Race information
    updateRaceList();
    updateTrackFromRace();

    if(tracks[selectedTrack]){
        document.getElementById("trackType").textContent=
            tracks[selectedTrack].type;
    }

    document.getElementById("raceName").textContent=
        race.name;

    document.getElementById("trackName").textContent=
        selectedTrack;

    // Winner card
    if(results.length){
        document.getElementById("winnerCard")
            .classList.remove("hidden");

        document.getElementById("winnerName")
            .textContent=results[0].Driver;

        document.getElementById("winnerTeam")
            .textContent=results[0].Team;

        document.getElementById("winnerNumber")
            .textContent=results[0].Number;

        document.getElementById("finishType")
            .textContent=finishType;
    }
}
