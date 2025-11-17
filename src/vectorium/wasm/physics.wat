;; Vectorium Physics Engine - WebAssembly Module
;; Compiles physics and animation updates to native code
;; Expected: 2-3x faster than JavaScript

(module
  ;; Import memory from JavaScript (shared with TypedArrays)
  (import "env" "memory" (memory 1))
  
  ;; Import Math functions
  (import "Math" "sin" (func $sin (param f32) (result f32)))
  (import "Math" "cos" (func $cos (param f32) (result f32)))
  (import "Math" "abs" (func $abs (param f32) (result f32)))
  
  ;; Physics Update Function
  ;; Updates position based on velocity and handles bouncing
  (func $updatePhysics (export "updatePhysics")
    (param $entityCount i32)
    (param $dt f32)
    (param $boundsWidth f32)
    (param $boundsHeight f32)
    (param $posXOffset i32)      ;; Byte offset to positionX array
    (param $posYOffset i32)      ;; Byte offset to positionY array
    (param $velXOffset i32)      ;; Byte offset to velocityX array
    (param $velYOffset i32)      ;; Byte offset to velocityY array
    (param $sizeOffset i32)      ;; Byte offset to size array
    (param $flagsOffset i32)     ;; Byte offset to flags array
    (param $FLAG_PHYSICS i32)    ;; Physics flag bitmask
    
    (local $i i32)
    (local $flag i32)
    (local $px f32)
    (local $py f32)
    (local $vx f32)
    (local $vy f32)
    (local $sz f32)
    (local $half f32)
    (local $posXAddr i32)
    (local $posYAddr i32)
    (local $velXAddr i32)
    (local $velYAddr i32)
    (local $sizeAddr i32)
    (local $flagAddr i32)
    
    ;; Loop through all entities
    (local.set $i (i32.const 0))
    (block $break
      (loop $continue
        ;; Check if we've processed all entities
        (br_if $break (i32.ge_u (local.get $i) (local.get $entityCount)))
        
        ;; Calculate array addresses (i * 4 bytes for Float32/Int32/Uint32)
        (local.set $flagAddr (i32.add (local.get $flagsOffset) (i32.mul (local.get $i) (i32.const 4))))
        
        ;; Load flag and check if physics is enabled
        (local.set $flag (i32.load (local.get $flagAddr)))
        (if (i32.eqz (i32.and (local.get $flag) (local.get $FLAG_PHYSICS)))
          (then
            ;; Skip this entity
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (br $continue)
          )
        )
        
        ;; Calculate array addresses
        (local.set $posXAddr (i32.add (local.get $posXOffset) (i32.mul (local.get $i) (i32.const 4))))
        (local.set $posYAddr (i32.add (local.get $posYOffset) (i32.mul (local.get $i) (i32.const 4))))
        (local.set $velXAddr (i32.add (local.get $velXOffset) (i32.mul (local.get $i) (i32.const 4))))
        (local.set $velYAddr (i32.add (local.get $velYOffset) (i32.mul (local.get $i) (i32.const 4))))
        (local.set $sizeAddr (i32.add (local.get $sizeOffset) (i32.mul (local.get $i) (i32.const 4))))
        
        ;; Load values
        (local.set $px (f32.load (local.get $posXAddr)))
        (local.set $py (f32.load (local.get $posYAddr)))
        (local.set $vx (f32.load (local.get $velXAddr)))
        (local.set $vy (f32.load (local.get $velYAddr)))
        (local.set $sz (f32.load (local.get $sizeAddr)))
        
        ;; Update position: px += vx * dt
        (local.set $px (f32.add (local.get $px) (f32.mul (local.get $vx) (local.get $dt))))
        (local.set $py (f32.add (local.get $py) (f32.mul (local.get $vy) (local.get $dt))))
        
        ;; Calculate half size
        (local.set $half (f32.mul (local.get $sz) (f32.const 0.5)))
        
        ;; Bounce X
        (if (f32.lt (f32.sub (local.get $px) (local.get $half)) (f32.const 0))
          (then
            (local.set $px (local.get $half))
            (local.set $vx (call $abs (local.get $vx)))
          )
        )
        (if (f32.gt (f32.add (local.get $px) (local.get $half)) (local.get $boundsWidth))
          (then
            (local.set $px (f32.sub (local.get $boundsWidth) (local.get $half)))
            (local.set $vx (f32.neg (call $abs (local.get $vx))))
          )
        )
        
        ;; Bounce Y
        (if (f32.lt (f32.sub (local.get $py) (local.get $half)) (f32.const 0))
          (then
            (local.set $py (local.get $half))
            (local.set $vy (call $abs (local.get $vy)))
          )
        )
        (if (f32.gt (f32.add (local.get $py) (local.get $half)) (local.get $boundsHeight))
          (then
            (local.set $py (f32.sub (local.get $boundsHeight) (local.get $half)))
            (local.set $vy (f32.neg (call $abs (local.get $vy))))
          )
        )
        
        ;; Store updated values
        (f32.store (local.get $posXAddr) (local.get $px))
        (f32.store (local.get $posYAddr) (local.get $py))
        (f32.store (local.get $velXAddr) (local.get $vx))
        (f32.store (local.get $velYAddr) (local.get $vy))
        
        ;; Increment counter
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $continue)
      )
    )
  )
  
  ;; Animation Update Function
  ;; Handles rotation animation (most common)
  (func $updateAnimations (export "updateAnimations")
    (param $entityCount i32)
    (param $dt f32)
    (param $rotationOffset i32)      ;; Byte offset to rotation array (Uint16)
    (param $rotationSpeedOffset i32) ;; Byte offset to rotationSpeed array (Int16)
    (param $animTypeOffset i32)      ;; Byte offset to animationType array (Uint8)
    (param $ANIM_ROTATE i32)         ;; Rotation animation type
    
    (local $i i32)
    (local $rot i32)
    (local $rotSpeed i32)
    (local $animType i32)
    (local $newRot i32)
    (local $rotAddr i32)
    (local $rotSpeedAddr i32)
    (local $animTypeAddr i32)
    (local $dt10 f32)
    
    ;; Pre-calculate dt * 10
    (local.set $dt10 (f32.mul (local.get $dt) (f32.const 10.0)))
    
    ;; Loop through all entities
    (local.set $i (i32.const 0))
    (block $break
      (loop $continue
        (br_if $break (i32.ge_u (local.get $i) (local.get $entityCount)))
        
        ;; Calculate addresses
        (local.set $animTypeAddr (i32.add (local.get $animTypeOffset) (local.get $i)))
        (local.set $rotAddr (i32.add (local.get $rotationOffset) (i32.mul (local.get $i) (i32.const 2))))
        (local.set $rotSpeedAddr (i32.add (local.get $rotationSpeedOffset) (i32.mul (local.get $i) (i32.const 2))))
        
        ;; Load animation type
        (local.set $animType (i32.load8_u (local.get $animTypeAddr)))
        
        ;; Check if rotation animation
        (if (i32.eq (local.get $animType) (local.get $ANIM_ROTATE))
          (then
            ;; Load rotation and speed
            (local.set $rot (i32.load16_u (local.get $rotAddr)))
            (local.set $rotSpeed (i32.load16_s (local.get $rotSpeedAddr)))
            
            ;; Calculate new rotation: rot + rotSpeed * dt * 10
            (local.set $newRot (i32.add (local.get $rot) 
              (i32.trunc_f32_s (f32.mul (f32.convert_i32_s (local.get $rotSpeed)) (local.get $dt10)))))
            
            ;; Modulo 360
            (local.set $newRot (i32.rem_s (local.get $newRot) (i32.const 360)))
            (if (i32.lt_s (local.get $newRot) (i32.const 0))
              (then
                (local.set $newRot (i32.add (local.get $newRot) (i32.const 360)))
              )
            )
            
            ;; Store new rotation
            (i32.store16 (local.get $rotAddr) (local.get $newRot))
          )
        )
        
        ;; Increment counter
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $continue)
      )
    )
  )
)
