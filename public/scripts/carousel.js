function postaviCarousel(glavniElement,sviElementi,index=0){
    if(glavniElement===null || glavniElement===undefined||sviElementi.length===0||index<0||index>=sviElementi.length)return null;
    glavniElement.innerHTML=sviElementi[index];
    function metoda1(){
        index--;
        if(index<0)index=sviElementi.length-1;
        glavniElement.innerHTML=sviElementi[index];
    }
    function metoda2(){
        index++;
        if(index===sviElementi.length)index=0;
        glavniElement.innerHTML=sviElementi[index];
    }

    return {
        fnLijevo:metoda1,
        fnDesno:metoda2,
    }
}