import { useMemo } from 'react'
import * as THREE from 'three'
import { Box, Instances, Sign, type Instance, type XYZ } from './primitives'
import { BOOTHS, COLUMNS, STUDY_PODS, floorY, type Floor } from './world'

const piece = (at: XYZ, size: XYZ, color: string): Instance => ({ at, size, color })
const glass = new THREE.MeshBasicMaterial({ color: '#b8d2d5', transparent: true, opacity: .12, depthWrite: false, side: THREE.DoubleSide })
const plane = new THREE.PlaneGeometry(1, 1)

export function DiningBooths() {
  const booths = useMemo(() => BOOTHS.flatMap(({ x, z }, i) => [
    piece([x, .77, z], [1.55, .10, 2.1], i % 2 ? '#b79a73' : '#cdb89b'),
    piece([x, .36, z], [.13, .72, 1.3], '#46484a'),
    ...[-1, 1].flatMap(side => [
      piece([x + side * 1.15, .26, z], [.68, .4, 2.5], '#66513d'),
      piece([x + side * 1.15, .49, z], [.68, .14, 2.5], i % 2 ? '#8c3d42' : '#626365'),
      piece([x + side * 1.48, .78, z], [.18, 1.16, 2.8], '#725840'),
      piece([x + side * 1.36, .88, z], [.12, .55, 2.5], i % 2 ? '#a3434a' : '#858582'),
      piece([x + side * 1.48, 1.37, z], [.2, .05, 2.8], '#9b7c56'),
    ]),
  ]), [])
  const fixtures = useMemo(() => [
    piece([0, 4.3, -16.6], [43, .22, 10.5], '#303638'),
    ...[-20, -12, -4, 4, 12, 20].flatMap(x => [
      piece([x, 4.14, -16], [.07, .06, 9], '#626766'),
      piece([x, 4.05, -20.9], [.06, .25, .06], '#acb0ac'),
    ]),
    ...[-18.2, -15.8].map(z => piece([7.5, .53, z], [.09, 1.06, .09], '#b6b8b5')),
    piece([7.5, .95, -17], [.06, .13, 2.8], '#363a3c'),
    ...[-6, 0, 6].flatMap(x => [
      piece([x, 2.6, -21.5], [5.8, .85, .2], '#343b3d'),
      piece([x, 1.62, -20], [5.2, .06, .85], '#a7adb0'),
    ]),
    ...[-19.7, -14, -8.3].map(z => piece([-21.6, 1.65, z], [.25, 3.3, .19], '#a7adaf')),
    piece([-21.7, 3.4, -14], [.35, .55, 14], '#ecece6'),
  ], [])
  const discs = useMemo(() => [-16, -8, 0, 8, 16].flatMap(x => [-19, -14].map(z => piece([x, 4.15, z], [.84, .045, .84], '#eee4cc'))), [])
  return <>
    <Instances items={booths} /><Instances items={fixtures} />
    <Instances items={discs} round unlit />
    <mesh position={[-21.55, 1.55, -14]} rotation={[0, Math.PI / 2, 0]} scale={[13.5, 3, 1]} geometry={plane} material={glass} dispose={null} />
    <Sign text="PORT CITY JAVA" small="CAFÉ / CLOSED UNTIL MORNING" at={[-21.43, 2.8, -14]} rotation={[0, Math.PI / 2, 0]} size={[6, .7]} bg="#303b3a" />
    <Sign text="DINING PAVILIONS" small="PLEASE KEEP THE MAIN AISLE CLEAR" at={[0, 3.7, -11.4]} size={[7, .55]} bg="#303638" />
  </>
}

function StudyFurniture({ floor }: { floor: 3 | 4 }) {
  const parts = useMemo(() => STUDY_PODS[floor].flatMap(({ x, z }, i) => [
    piece([x, .73, z], [1.25, .1, 1.2], '#cec9b9'),
    piece([x, .35, z], [.1, .7, .1], '#777d7f'),
    piece([x, .06, z], [.7, .08, .7], '#454a4e'),
    ...[-1, 1].flatMap(side => [
      piece([x + side * 1.12, .39, z], [.7, .22, .8], floor === 3 ? '#b23c46' : ['#a72f3e', '#3f7276', '#373e42'][i % 3]),
      piece([x + side * 1.42, .73, z], [.13, .67, .8], floor === 3 ? '#b23c46' : ['#a72f3e', '#3f7276', '#373e42'][i % 3]),
      ...[-.26, .26].flatMap(dx => [-.3, .3].map(dz => piece([x + side * 1.12 + dx, .15, z + dz], [.045, .3, .045], '#52575a'))),
    ]),
  ]), [floor])
  return <Instances items={parts} />
}

function BallroomExterior() {
  const panels = useMemo(() => [
    piece([-21.2, 2.15, 3.7], [1.4, 4.3, 15], '#a72837'),
    ...Array.from({ length: 12 }, (_, i) => piece([-20.47 - (i % 3) * .015, 2.15, -3.1 + i * 1.23], [.09, 4.25, 1.18], ['#ac2938', '#982534', '#b8303e'][i % 3])),
    ...Array.from({ length: 9 }, (_, i) => ({ ...piece([-20.39, 2.3, -2.7 + i * 1.5], [.025, 3.8, .035], '#821f2e'), rotation: [Math.PI / 9, 0, 0] as XYZ })),
    piece([-20.35, 4.34, 3.7], [.25, .12, 15.2], '#eeeae1'),
  ], [])
  return <>
    <Instances items={panels} />
    <Sign text="STATE BALLROOM" at={[-20.32, 3.95, 3.7]} rotation={[0, Math.PI / 2, 0]} size={[8, .6]} bg="transparent" fg="#e6e9e8" />
    <Box at={[-3, 2.1, -21.65]} size={[7.7, 4.2, .3]} color="#e0e1dc" />
    <Sign text="STEWART THEATRE" small="3 / PUBLIC LOUNGE · CLOSED AFTER HOURS" at={[-3, 3, -21.45]} size={[6.8, .6]} bg="transparent" fg="#41494b" />
  </>
}

function GlazedStudyRooms() {
  const posts = useMemo(() => [
    ...[-17.5, -12.5, -7.5, -2.5, 2.5, 7.5, 12.5, 17.5].map(x => piece([x, 1.8, -20], [.065, 3.6, .12], '#abb4b5')),
    ...[.1, 2.45, 3.6].map(y => piece([0, y, -20], [35, .07, .12], '#abb4b5')),
    ...[-15, -5, 5, 15].flatMap(x => [
      piece([x, .74, -21], [2.6, .1, 1.05], '#b3a58f'),
      piece([x - 1.05, .35, -21], [.06, .7, .6], '#61696a'),
      piece([x + 1.05, .35, -21], [.06, .7, .6], '#61696a'),
      piece([x, 1, -21.6], [.7, .95, .2], '#a33140'),
      piece([x + 1.2, 2.4, -20], [.05, .4, .12], '#e3e7e3'),
    ]),
  ], [])
  return <>
    <Box at={[0, 1.8, -21.9]} size={[35, 3.6, .08]} color="#a7b1b3" />
    <mesh position={[0, 1.8, -20]} scale={[35, 3.6, 1]} geometry={plane} material={glass} dispose={null} />
    <Instances items={posts} />
    <Sign text="UPPER LOUNGE / STUDY ROOMS" at={[0, 3.9, -20]} size={[8, .45]} bg="#e7e8e1" fg="#38454a" />
  </>
}

function UpperPublicSpace({ floor }: { floor: 3 | 4 }) {
  const lights = useMemo(() => [-17, -8, 1, 10, 19].flatMap(x => [-16, 18.5].map(z => piece([x, 4.43, z], [3.1, .035, .12], '#eae6d8'))), [])
  const bands = useMemo(() => COLUMNS.map(({ x, z }) => piece([x, 2.6, z], [.96, .52, .96], '#d4d7d5')), [])
  return <group position={[0, floorY(floor), 0]}>
    <StudyFurniture floor={floor} />
    <Instances items={lights} unlit />
    <Instances items={bands} round />
    {COLUMNS.flatMap(({ x, z }, i) => [0, Math.PI].map((angle, j) => <Sign key={`${i}-${j}`} text={String(floor)} at={[x, 2.6, z + (j ? -.49 : .49)]} rotation={[0, angle, 0]} size={[.55, .42]} bg="transparent" fg="#475256" />))}
    {floor === 3 ? <BallroomExterior /> : <GlazedStudyRooms />}
  </group>
}

export function PublicInteriors({ floor }: { floor: Floor }) {
  return floor === 2 ? <DiningBooths /> : <UpperPublicSpace floor={floor} />
}
