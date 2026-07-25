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

function getFinishType(){

    return weightedPick(
        finishTypes,
        "weight"
    ).type;

}

function selectOpenEntries(series){
    let key = Object.keys(openEntryOdds).find(
        s => s.toLowerCase() === series.toLowerCase()
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

        driver.Weight=Number(driver.Weight);
        driver["Entry Weight"]=Number(driver["Entry Weight"]) || 0;
        driver.Chartered=driver.Chartered==="Yes";
        driver.Active=driver.Active==="Yes";

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

function generateResults(field){

    let remaining=[...field];

    let results=[];

    while(remaining.length){

        const picked=weightedPick(remaining,"Weight");

        results.unshift(picked);

        remaining=remaining.filter(d=>d!==picked);

    }

    return results;
}

function runRace(){

    const selectedSeries=document.getElementById("series").value;

    console.log("Selected series:", selectedSeries);

    let allDrivers = drivers.filter(driver =>
        driver.Series.trim().toLowerCase() === selectedSeries.trim().toLowerCase() &&
        driver.Active
    );

    let chartered = allDrivers.filter(driver => driver.Chartered);

    let unchartered = allDrivers.filter(driver => !driver.Chartered);

    let openCount = selectOpenEntries(selectedSeries);

    let openDrivers = getOpenDrivers(unchartered,openCount);

    document.getElementById("openList").textContent =
        openDrivers.length
        ? "Open Cars: " + openDrivers.map(d=>d.Driver).join(", ")
        : "Open Cars: None";

    let field = [
        ...chartered,
        ...openDrivers
    ];

    console.log(field);

    const results=generateResults(field);

    document.getElementById("fieldSize").textContent =
    `Field Size: ${field.length}`;
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

    document.getElementById("winnerCard").classList.remove("hidden");

    document.getElementById("winnerName").textContent=results[0].Driver;

    document.getElementById("winnerTeam").textContent=results[0].Team;

    document.getElementById("finishType").textContent =
    getFinishType();
}
