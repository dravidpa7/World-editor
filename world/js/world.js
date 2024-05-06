class World{
    constructor(graph,
        roadWidth=100,
        roadRoundness=10,
        buildingWidth=150,
        buildingMinWidth=50,
        spacing=50,
        treeSize=160
        ){
        this.graph=graph;
        this.roadWidth=roadWidth;
        this.roadRoundness=roadRoundness;
        this.buildingWidth=buildingWidth;
        this.buildingMinWidth=buildingMinWidth;
        this.spacing=spacing;
        this.treeSize=treeSize;

        this.envelopes=[];
        this.roadBorders=[];
        this.buildings=[];
        this.trees=[];
        this.laneGuides=[];
        this.markings=[];

        this.cars=[];
        this.bestCar=null;

        this.generate();
    }

    static load(info){
        const world=new World(new Graph());
        world.graph=Graph.load(info.graph);
        world.roadWidth=info.roadWidth;
        world.roadRoundness=info.roadRoundness;
        world.buildingWidth=info.buildingWidth;
        world.buildingMinWidth=info.buildingMinWidth;
        world.spacing=info.spacing;
        world.treeSize=info.treeSize;
        world.envelopes=info.envelopes.map((e)=>Envelope.load(e));
        world.roadBorders=info.roadBorders.map((b)=>new Segment(b.p1,b.p2));
        world.laneGuides=info.laneGuides.map((g)=>new Segment(g.p1,g.p2));
        world.markings=info.markings.map((m)=>Marking.load(m));
        world.zoom=info.zoom;
        world.offset=info.offset;
        return world;
    }

    generate(){
        this.envelopes.length=0;
        for(const seg of this.graph.segments){
            this.envelopes.push(
                new Envelope(seg,this.roadWidth,this.roadRoundness)
            );
        }
        this.roadBorders=Polygon.union(this.envelopes.map((e)=>e.poly));
        this.laneGuides.length=0;
        this.laneGuides.push(...this.#generateLaneGuides());
    }

    #generateLaneGuides(){
        const tmpEnvelops=[];
        for(const seg of this.graph.segments){
            tmpEnvelops.push(
                new Envelope(
                    seg,
                    this.roadWidth/2,
                    this.roadRoundness
                )
            );
        }
        const segments=Polygon.union(tmpEnvelops.map((e)=>e.poly));
        return segments;
    }

       #generateBuildings(){
        const tmpEnvelops=[];
        for(const seg of this.graph.segments){
            tmpEnvelops.push(
                new Envelope(
                    seg,
                    this.roadWidth + this.buildingWidth + this.spacing*2,
                    this.roadRoundness
                )
            );
        }
        const guides = Polygon.union(tmpEnvelops.map((e)=> e.poly));
        for(let i=0;i<guides.length;i++){
            const seg =guides[i];
            if(seg.length()<this.buildingMinWidth){
                guides.splice(i,1);
                i--;
            }
        }

        const supports=[];
        for(let seg of guides){
            const len =seg.length()+this.spacing;
            const buildingCount =Math.floor(
                len/(this.buildingMinWidth +this.spacing)
            );
            const buildingLength=len/buildingCount - this.spacing;  
            const dir=seg.directionVector();
            let q1=seg.p1;
            let q2=add(q1,scale(dir,buildingLength));
            supports.push(new Segment(q1,q2));
            for(let i=2;i<=buildingCount;i++){
                q1=add(q2,scale(dir,this.spacing));
                q2=add(q1,scale(dir,buildingLength));
                supports.push(new Segment(q1,q2));
            }
        }


        const bases=[];

        for(const seg of supports){
            bases.push(new Envelope(seg,this.buildingWidth).poly);
        }

        const eps = 0.001;
        for(let i=0;i<bases.length-1;i++){
            for(let j=i+1;j<bases.length;j++){
                if(bases[i].intersectsPoly(bases[j]) || bases[i].distanceToPoly(bases[j])<this.spacing-eps){
                    bases.splice(j,1);
                    j--;
                }
            }
        }

        return bases.map((b)=>new Building(b));
    }

    draw(ctx,viewPoint,showStartMarkings=true,renderRadius=1000){
        for(const env of this.envelopes){
            env.draw(ctx,{fill:"#BBB",stroke:"#BBB",lineWidth:15});
        }
        for(const marking of this.markings){
            if(!(marking instanceof Start)||showStartMarkings){
                marking.draw(ctx)
            }
        }
        for (const seg of this.graph.segments){
            seg.draw(ctx,{color:"white",width:4,dash:[10,10]});
        }
        for(const seg of this.roadBorders){
            seg.draw(ctx,{color:"white",width:4});
        }
        ctx.globalAlpha=0.2;
        for(const car of this.cars){
            car.draw(ctx);
        }
        ctx.globalAlpha=1;
        if(this.bestCar){
            this.bestCar.draw(ctx,true);
        }
        const items=[...this.buildings,...this.trees].filter(
            (i)=>i.base.distanceToPoint(viewPoint)<renderRadius
        )
        items.sort(
            (a,b)=>
                b.base.distanceToPoint(viewPoint)-
                a.base.distanceToPoint(viewPoint)
        )
        for(const item of items){
            item.draw(ctx,viewPoint);
        }
    }
}
