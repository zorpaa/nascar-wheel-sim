document.getElementById("runRace").addEventListener("click", runRace);

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

// STEP 4
function generateResults(field){

    let remaining=[...field];

    let results=[];

    while(remaining.length){

        const picked = weightedPick(remaining,"weight");

        results.unshift(picked);

        remaining=remaining.filter(d=>d!==picked);

    }

    return results;

}

// STEP 5
function runRace(){

    const field=[...cupDrivers];

    const results=generateResults(field);

    const list=document.getElementById("resultsList");

    list.innerHTML="";

    results.forEach(driver=>{

        const li=document.createElement("li");

        li.textContent=`${driver.name} (${driver.team})`;

        list.appendChild(li);

    });

    document.getElementById("winnerCard").classList.remove("hidden");

    document.getElementById("winnerName").textContent=results[0].name;

    document.getElementById("winnerTeam").textContent=results[0].team;

}
