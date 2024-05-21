class Puzzle extends Phaser.Scene {
        preload() {
                this.load.image('water_wheel', 'water_wheel.png')
                this.load.image('wood', 'plank.jpg')
                this.load.image('gear', 'gear.png')
                this.load.image('droplet', 'white.png')
                this.load.image('generator', 'bulb.png')
                this.load.image('background', 'stream.jpg')
                this.load.json("sprites", "sprite-physics.json");
        }

        create() {
                this.puzzleCenter = new v2(config.width / 2, config.height / 2)
                this.parts = this.createParts(this.puzzleCenter)
                this.wheelAngle = 0
                this.createWorld()
                this.parts.forEach(p => p.setInteractive({
                        pixelPerfect: true,
                        draggable: true
                }));

                this.parts[2].placeAfter = [this.parts[0]] // wheel before gear1
                this.parts.forEach(p => p.on('dragend', () => {
                        for (let i in p.placeAfter)
                                if (!(this.parts[i].placed)) return
                        p.tryPlacement()
                }))

                this.matter.add.mouseSpring({
                        length: 1,
                        stiffness: 0.6
                });
        }

        createWorld() {
                this.matter.world.setBounds()
                this.add.image(config.width / 3, 0, 'background').setDepth(-1)
                this.parts.forEach((p) => {
                        this.add.circle(p.config.endPos.x, p.config.endPos.y, 10, {
                                isStatic: true
                        })
                })
                this.createWater()
        }

        createWater(dropCount = 50, dropsPerSecond = 25, mass = 3) {

                const groupConfig = {
                        maxSize: dropCount,
                        createCallback: (drop) => {
                                this.matter.add.gameObject(drop, {
                                        shape: 'circle',
                                        ignorePointer: true,
                                        friction: 0,
                                        mass
                                }, true)
                                drop.setScale(0.4).setTexture('droplet')
                        }
                }

                const create = (dropGroup, repeat = dropCount - 1) =>
                        dropGroup.createMultiple(repeat)

                this.drops = this.add.group(groupConfig) // waterfall
                create(this.drops)
                new Phaser.Core.TimeStep(this.game, {
                        forceSetTimeOut: true,
                        target: dropsPerSecond
                }).start((time, delta) => {
                        const drop = this.drops.get(15 + Math.floor(Math.random() * 125), 5)
                        if (drop) drop.active = true
                })
        }

        update() {
                this.parts.forEach(p => p.update())
                this.drops.getChildren().forEach((d) => {
                        if (d.y > config.height - 25) this.drops.kill(d)
                })
                if (this.winCondition()) {
                        console.log('win')
                        // this.parts[3].postFX.addGlow(0xffff00, 8, 8, true, 0.1, 24);
                } else {
                        this.wheelAngle = this.parts[0].angle
                }
        }

        winCondition() {
                this.parts.forEach(p => { // ensure all parts placed
                        if (!p.placed) return false
                })
                if ((this.wheelAngle - this.parts[0].angle) > 150) return true
                return false
        }

        createParts(center) {
                return [
                        new Part({
                                name: 'wheel',
                                scene: this,
                                x: 1000,
                                y: 400,
                                texture: 'water_wheel',
                                canRotate: true,
                                endAngle: 0,
                                shape: this.cache.json.get("sprites")['water_wheel'],
                                endPos: new v2(center.x, center.y)
                                        .add(new v2(0, 100))
                        }).setScale(0.3).setMass(5),
                        new Part({
                                name: 'ramp',
                                scene: this,
                                x: 600,
                                y: 600,
                                texture: 'wood',
                                endAngle: 10,
                                endPos: new v2(center.x, center.y)
                                        .add(new v2(-400, -120))
                        }).setScale(0.3, 0.3).setRectangle(625, 30),
                        new Part({
                                name: 'gear1',
                                scene: this,
                                x: 500,
                                y: 200,
                                texture: 'gear',
                                endAngle: 90,
                                shape: this.cache.json.get("sprites")['gear'],
                                endPos: new v2(center.x, center.y)
                                        .add(new v2(0, 100))
                        }).setScale(0.25).setMass(1),
                        new Part({
                                name: 'generator',
                                scene: this,
                                x: 700,
                                y: 400,
                                texture: 'generator',
                                endAngle: 0,
                                endPos: new v2(center.x, center.y)
                                        .add(new v2(300, -250))
                        }).setScale(0.05),
                        new Part({
                                name: 'gear2',
                                scene: this,
                                x: 700,
                                y: 400,
                                texture: 'gear',
                                endAngle: 90,
                                endPos: new v2(center.x, center.y)
                                        .add(new v2(300, -150))
                        }).setScale(0.1),
                ]
        }
}

class Part extends Phaser.GameObjects.Sprite {
        constructor(config) {
                super(config.scene, config.x, config.y, config.texture)
                this.config = config
                config.scene.add.existing(
                        config.scene.matter.add.gameObject(this, {
                                shape: config.shape,
                                frictionStatic: 0
                        }, true)
                )
                this.setScale(0.2)
                this.placed = false

                this.on('drag', this.lift)

                this.startPos = new Phaser.Math.Vector2(config.x, config.y)
                this.setPosition(this.startPos.x, this.startPos.y)
        }

        lift(pointer, dragX, dragY) {
                if (this.endPosConstraint)
                        this.config.scene.matter.world.removeConstraint(this.endPosConstraint)
                this.placed = false
                this.angle = this.config.endAngle
                this.setAngularVelocity(0)
                this.x = dragX
                this.y = dragY
        }

        tryPlacement() {
                // ramp doesn't snap into place
                if (this.config.name == "ramp" && this.nearEndPos(300)) {
                        this.setStatic(true)
                        return
                }
                // place if near this.endPos
                if (this.nearEndPos()) this.place()
                else this.unplace()
        }

        nearEndPos(range = 50) {
                // true if position is near this.endPos
                return (Phaser.Math.Distance.Between(
                        this.config.endPos.x, this.config.endPos.y,
                        this.x, this.y) < range)
        }

        place() {
                this.placed = true
                this.endPosConstraint =
                        this.config.scene.matter.add.worldConstraint(this, 0, 1, {
                                pointA: {
                                        x: this.config.endPos.x,
                                        y: this.config.endPos.y
                                }
                        })
        }

        unplace() {
                this.placed = false
                this.setStatic(false)
        }

        update() {
                if (!this.placed) return
                if (this.config.name != "wheel") {
                        this.angle = this.config.endAngle
                        this.position = this.config.endPos
                }
                if (this.config.name == "gear1") {
                        this.angle = this.scene.parts[0].angle
                }
                if (this.config.name == "gear2" && this.scene.parts[2].placed) {
                        this.angle = this.scene.parts[0].angle
                }
        }
}

const v2 = Phaser.Math.Vector2
const config = {
        type: Phaser.AUTO,
        width: 1280,
        height: 720,
        backgroundColor: '#1b1464',
        parent: 'power puzzle',
        debug: true,
        physics: {
                default: 'matter',
                matter: {
                        // debug: true
                }
        },
        scene: Puzzle
};

const game = new Phaser.Game(config);
