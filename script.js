document.getElementById("runRace").addEventListener("click", runRace);

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

    let field = drivers.filter(driver =>
        driver.Series === selectedSeries &&
        driver.Active
    );
    console.log(field);
    const results=generateResults(field);

    const list=document.getElementById("resultsList");

    list.innerHTML="";

    results.forEach(driver=>{

        const li=document.createElement("li");

        li.textContent=`${driver.Driver} (${driver.Team})`;

        list.appendChild(li);

    });

    document.getElementById("winnerCard").classList.remove("hidden");

    document.getElementById("winnerName").textContent=results[0].Driver;

    document.getElementById("winnerTeam").textContent=results[0].Team;

}
