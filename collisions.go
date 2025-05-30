package main

import (
	"encoding/json"
	"image/png"
	"os"
)

func main() {
	file, err := os.Open("collisions.png")
	if err != nil {
		panic("error opening image" + err.Error())
	}
	defer file.Close()

	img, err := png.Decode(file)
	if err != nil {
		panic("error decoding img " + err.Error())
	}

	bounds := img.Bounds() //for dimensions
	width, height := bounds.Max.X, bounds.Max.Y
	tileSize := 16
	tileCols := width / tileSize
	tileRows := height / tileSize

	collisions := make([][]int, tileRows)
	for y := 0; y < tileRows; y++ {
		collisions[y] = make([]int, tileCols)
	}

	for y := 0; y < tileRows; y++ {
		for x := 0; x < tileCols; x++ {
			r, g, b, a := img.At(x*tileSize, y*tileSize).RGBA()
			r8, g8, b8, a8 := uint8(r>>8), uint8(g>>8), uint8(b>>8), uint8(a>>8)

			if a8 >= 250 {
				switch {
				case r8 == 255 && g8 == 0 && b8 == 0: //Red : ground
					collisions[y][x] = 1
				case r8 == 0 && g8 == 255 && b8 == 0: //Green : walls
					collisions[y][x] = 2
				case r8 == 0 && g8 == 0 && b8 == 255: //Blue : one-way platforms
					collisions[y][x] = 3
				case r8 == 128 && g8 == 0 && b8 == 128: // Purple : two-way platforms
					collisions[y][x] = 7
				case r8 == 255 && g8 == 255 && b8 == 0: //Yellow : hazards
					collisions[y][x] = 4
				case r8 == 255 && g8 == 165 && b8 == 0: //Orange : doors
					collisions[y][x] = 8
				}
			} else {
				collisions[y][x] = 0 //Empty
			}
		}
	}

	//just a count for debugging
	totalGround := 0
	totalWalls := 0
	totalOneWay := 0
	totalTwoWay := 0
	totalHazards := 0
	totalDoors := 0
	totalEmpty := 0
	for y := 0; y < tileRows; y++ {
		for x := 0; x < tileCols; x++ {
			switch collisions[y][x] {
			case 1:
				totalGround++
			case 2:
				totalWalls++
			case 3:
				totalOneWay++
			case 7:
				totalTwoWay++
			case 4:
				totalHazards++
			case 8:
				totalDoors++
			case 0:
				totalEmpty++
			}
		}
	}

	//make json and save to it
	output, err := json.MarshalIndent(collisions, "", "  ")
	if err != nil {
		panic("error encoding" + err.Error())
	}
	err = os.WriteFile("collisions.json", output, 0644)
	if err != nil {
		panic("error writing to json" + err.Error())
	}

	println("Generated collisions.json:", tileRows, "x", tileCols)
	println("Full map stats:")
	println("Ground (1):", totalGround)
	println("Walls (2):", totalWalls)
	println("One-way Platforms (3):", totalOneWay)
	println("Two-way Platforms (7):", totalTwoWay)
	println("Hazards (4):", totalHazards)
	println("Doors (8):", totalDoors)
	println("Empty (0):", totalEmpty)
}
