class Puzzle extends Phaser.Scene {
        preload() {
                this.load.image('water_wheel', 'water_wheel.png')
                this.load.image('wood', 'plank.jpg')
                this.load.image('part3', 'arch.png')
                this.load.image('part4', 'arch.png')
                this.load.image('part5', 'arch.png')
        }

        create() {
                this.puzzleCenter = new v2(config.width / 2, config.height / 2)
                this.parts = this.createParts(this.puzzleCenter)
                this.createWorld()
                this.parts.forEach(p => p.setInteractive({
                        pixelPerfect: true,
                        draggable: true
                }));

                this.parts[2].placeAfter = [this.parts[0]] // wheel before gear1
                this.parts[3].placeAfter = [this.parts[4]] // generator before gear2
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
                this.parts.forEach((p) => {
                        this.add.circle(p.config.endPos.x, p.config.endPos.y, 5, {
                                isStatic: true
                        })
                })
                this.createWater()
        }

        createWater(dropCount = 100, dropsPerSecond = 30) {
                this.drops = this.add.group({
                        maxSize: dropCount,
                        createCallback: (drop) => {
                                this.matter.add.gameObject(drop, {
                                        shape: 'circle',
                                        friction: 0,
                                        ignorePointer: true
                                }, true)
                                drop.setScale(0.4)
                        }
                })
                this.drops.createMultiple({
                        repeat: dropCount - 1,
                })
                new Phaser.Core.TimeStep(this.game, {
                        forceSetTimeOut: true,
                        target: dropsPerSecond
                }).start((time, delta) => {
                        const drop = this.drops.get(50 + Math.floor(Math.random() * 100), 25)
                        if (drop) drop.active = true
                })
        }

        update() {
                this.parts.forEach(p => p.update())
                this.drops.getChildren().forEach((d) => {
                        if (d.y > config.height - 25) this.drops.kill(d)
                })
        }

        createParts(center) {
                return [
                        new Part({
                                name: 'wheel',
                                scene: this,
                                x: 100,
                                y: 500,
                                texture: 'water_wheel',
                                canRotate: true,
                                endAngle: 0,
                                endPos: new v2(center.x, center.y)
                                        .add(new v2(0, 100))
                        }).setScale(0.3).setCircle(130),
                        new Part({
                                name: 'ramp',
                                scene: this,
                                x: 350,
                                y: 400,
                                texture: 'wood',
                                endAngle: 10,
                                endPos: new v2(center.x, center.y)
                                        .add(new v2(-180, -120))
                        }).setScale(0.17, 0.1).setRectangle(345, 25),
                        new Part({
                                name: 'gear1',
                                scene: this,
                                x: 500,
                                y: 500,
                                texture: 'part3',
                                endAngle: 90,
                                endPos: new v2(center.x, center.y)
                                        .add(new v2(0, 100))
                        }).setScale(0.25),
                        new Part({
                                name: 'generator',
                                scene: this,
                                x: 700,
                                y: 300,
                                texture: 'part5',
                                endAngle: 90,
                                endPos: new v2(center.x, center.y)
                                        .add(new v2(300, -150))
                        }),
                        new Part({
                                name: 'gear2',
                                scene: this,
                                x: 700,
                                y: 500,
                                texture: 'part4',
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
                config.scene.add.existing(this)
                config.scene.matter.add.gameObject(this, {}, true)
                this.setScale(0.2)
                this.placed = false

                this.on('drag', this.lift)

                this.startPos = new Phaser.Math.Vector2(config.x, config.y)
                this.setPosition(this.startPos.x, this.startPos.y)
        }

        lift(pointer, dragX, dragY) {
                this.placed = false
                this.angle = this.config.endAngle
                this.setAngularVelocity(0)
                this.x = dragX
                this.y = dragY
        }

        tryPlacement() {
                // ramp doesn't snap into place
                if (this.config.name == "ramp" && this.nearEndPos(100)) {
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
        }

        unplace() {
                this.placed = false
                this.setStatic(false)
        }

        update() {
                if (!this.placed) return
                this.setPosition(this.config.endPos.x, this.config.endPos.y)

                if (this.config.name != "wheel") this.angle = this.config.endAngle
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
        width: 800,
        height: 600,
        backgroundColor: '#1b1464',
        parent: 'power puzzle',
        debug: true,
        physics: {
                default: 'matter',
                matter: {
                        debug: true
                }
        },
        scene: Puzzle
};

const game = new Phaser.Game(config);
