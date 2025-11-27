(module
 (type $0 (func (param i32) (result i32)))
 (type $1 (func (param i32 i32)))
 (type $2 (func (param i32 i32) (result i32)))
 (type $3 (func (param i32)))
 (type $4 (func (param f32) (result f32)))
 (type $5 (func (result i32)))
 (type $6 (func))
 (type $7 (func (param i32 i32 i32 i32)))
 (type $8 (func (param i32 i32) (result f32)))
 (type $9 (func (param i32 i32 f32)))
 (type $10 (func (param i32 i32 i32 i32 i32 i32 i32 i32 i32 i32) (result i32)))
 (import "env" "abort" (func $~lib/builtins/abort (param i32 i32 i32 i32)))
 (global $~lib/rt/stub/offset (mut i32) (i32.const 0))
 (global $assembly/rendering/vertexBuffer (mut i32) (i32.const 0))
 (global $~argumentsLength (mut i32) (i32.const 0))
 (global $~lib/math/rempio2f_y (mut f64) (f64.const 0))
 (global $~lib/rt/__rtti_base i32 (i32.const 1440))
 (memory $0 1)
 (data $0 (i32.const 1036) ",")
 (data $0.1 (i32.const 1048) "\02\00\00\00\1c\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00l\00e\00n\00g\00t\00h")
 (data $1 (i32.const 1084) "<")
 (data $1.1 (i32.const 1096) "\02\00\00\00&\00\00\00~\00l\00i\00b\00/\00a\00r\00r\00a\00y\00b\00u\00f\00f\00e\00r\00.\00t\00s")
 (data $2 (i32.const 1148) "<")
 (data $2.1 (i32.const 1160) "\02\00\00\00(\00\00\00A\00l\00l\00o\00c\00a\00t\00i\00o\00n\00 \00t\00o\00o\00 \00l\00a\00r\00g\00e")
 (data $3 (i32.const 1212) "<")
 (data $3.1 (i32.const 1224) "\02\00\00\00\1e\00\00\00~\00l\00i\00b\00/\00r\00t\00/\00s\00t\00u\00b\00.\00t\00s")
 (data $4 (i32.const 1276) "<")
 (data $4.1 (i32.const 1288) "\02\00\00\00$\00\00\00I\00n\00d\00e\00x\00 \00o\00u\00t\00 \00o\00f\00 \00r\00a\00n\00g\00e")
 (data $5 (i32.const 1340) "<")
 (data $5.1 (i32.const 1352) "\02\00\00\00$\00\00\00~\00l\00i\00b\00/\00t\00y\00p\00e\00d\00a\00r\00r\00a\00y\00.\00t\00s")
 (data $6 (i32.const 1408) ")\15DNn\83\f9\a2\c0\dd4\f5\d1W\'\fcA\90C<\99\95b\dba\c5\bb\de\abcQ\fe")
 (data $7 (i32.const 1440) "\07\00\00\00 \00\00\00 \00\00\00 \00\00\00\00\00\00\00\01\19\00\00\81\00\00\00A")
 (export "initRendering" (func $assembly/rendering/initRendering))
 (export "generateVertexBuffer" (func $assembly/rendering/generateVertexBuffer))
 (export "getVertexBufferPtr" (func $assembly/rendering/getVertexBufferPtr))
 (export "getVertexBufferSize" (func $assembly/rendering/getVertexBufferSize))
 (export "__new" (func $~lib/rt/stub/__new))
 (export "__pin" (func $~lib/rt/stub/__pin))
 (export "__unpin" (func $~lib/rt/stub/__unpin))
 (export "__collect" (func $~lib/rt/stub/__collect))
 (export "__rtti_base" (global $~lib/rt/__rtti_base))
 (export "memory" (memory $0))
 (start $~start)
 (func $~lib/rt/common/OBJECT#set:gcInfo (param $0 i32) (param $1 i32)
  local.get $0
  local.get $1
  i32.store offset=4
 )
 (func $~lib/rt/common/OBJECT#set:gcInfo2 (param $0 i32) (param $1 i32)
  local.get $0
  local.get $1
  i32.store offset=8
 )
 (func $~lib/rt/stub/__new (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  local.get $0
  i32.const 1073741804
  i32.gt_u
  if
   i32.const 1168
   i32.const 1232
   i32.const 86
   i32.const 30
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.const 16
  i32.add
  local.tee $3
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 1168
   i32.const 1232
   i32.const 33
   i32.const 29
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/rt/stub/offset
  local.set $5
  global.get $~lib/rt/stub/offset
  i32.const 4
  i32.add
  local.tee $2
  local.get $3
  i32.const 19
  i32.add
  i32.const -16
  i32.and
  i32.const 4
  i32.sub
  local.tee $6
  i32.add
  local.tee $3
  memory.size
  local.tee $4
  i32.const 16
  i32.shl
  i32.const 15
  i32.add
  i32.const -16
  i32.and
  local.tee $7
  i32.gt_u
  if
   local.get $4
   local.get $3
   local.get $7
   i32.sub
   i32.const 65535
   i32.add
   i32.const -65536
   i32.and
   i32.const 16
   i32.shr_u
   local.tee $7
   local.get $4
   local.get $7
   i32.gt_s
   select
   memory.grow
   i32.const 0
   i32.lt_s
   if
    local.get $7
    memory.grow
    i32.const 0
    i32.lt_s
    if
     unreachable
    end
   end
  end
  local.get $3
  global.set $~lib/rt/stub/offset
  local.get $5
  local.get $6
  i32.store
  local.get $2
  i32.const 4
  i32.sub
  local.tee $3
  i32.const 0
  call $~lib/rt/common/OBJECT#set:gcInfo
  local.get $3
  i32.const 0
  call $~lib/rt/common/OBJECT#set:gcInfo2
  local.get $3
  local.get $1
  i32.store offset=12
  local.get $3
  local.get $0
  i32.store offset=16
  local.get $2
  i32.const 16
  i32.add
 )
 (func $~lib/arraybuffer/ArrayBufferView#set:buffer (param $0 i32) (param $1 i32)
  local.get $0
  local.get $1
  i32.store
 )
 (func $~lib/typedarray/Float32Array#constructor (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  i32.const 12
  i32.const 4
  call $~lib/rt/stub/__new
  local.tee $1
  i32.eqz
  if
   i32.const 12
   i32.const 3
   call $~lib/rt/stub/__new
   local.set $1
  end
  local.get $1
  i32.const 0
  call $~lib/arraybuffer/ArrayBufferView#set:buffer
  local.get $1
  i32.const 0
  call $~lib/rt/common/OBJECT#set:gcInfo
  local.get $1
  i32.const 0
  call $~lib/rt/common/OBJECT#set:gcInfo2
  local.get $0
  i32.const 268435455
  i32.gt_u
  if
   i32.const 1056
   i32.const 1104
   i32.const 19
   i32.const 57
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.const 2
  i32.shl
  local.tee $0
  i32.const 1
  call $~lib/rt/stub/__new
  local.tee $2
  i32.const 0
  local.get $0
  memory.fill
  local.get $1
  local.get $2
  call $~lib/arraybuffer/ArrayBufferView#set:buffer
  local.get $1
  local.get $2
  call $~lib/rt/common/OBJECT#set:gcInfo
  local.get $1
  local.get $0
  call $~lib/rt/common/OBJECT#set:gcInfo2
  local.get $1
 )
 (func $assembly/rendering/initRendering (param $0 i32)
  local.get $0
  i32.const 30
  i32.mul
  call $~lib/typedarray/Float32Array#constructor
  global.set $assembly/rendering/vertexBuffer
 )
 (func $~lib/arraybuffer/ArrayBuffer#get:byteLength (param $0 i32) (result i32)
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
 )
 (func $~lib/typedarray/Float32Array.wrap@varargs (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  block $2of2
   block $1of2
    block $outOfRange
     global.get $~argumentsLength
     i32.const 1
     i32.sub
     br_table $1of2 $1of2 $2of2 $outOfRange
    end
    unreachable
   end
   i32.const -1
   local.set $2
  end
  local.get $0
  call $~lib/arraybuffer/ArrayBuffer#get:byteLength
  local.set $1
  local.get $2
  i32.const 0
  i32.lt_s
  if
   local.get $2
   i32.const -1
   i32.eq
   if
    local.get $1
    i32.const 3
    i32.and
    if
     i32.const 1056
     i32.const 1360
     i32.const 1865
     i32.const 9
     call $~lib/builtins/abort
     unreachable
    end
   else
    i32.const 1056
    i32.const 1360
    i32.const 1869
    i32.const 7
    call $~lib/builtins/abort
    unreachable
   end
   local.get $1
   local.set $2
  else
   local.get $2
   i32.const 2
   i32.shl
   local.tee $2
   local.get $1
   i32.gt_s
   if
    i32.const 1056
    i32.const 1360
    i32.const 1874
    i32.const 7
    call $~lib/builtins/abort
    unreachable
   end
  end
  i32.const 12
  i32.const 4
  call $~lib/rt/stub/__new
  local.tee $1
  local.get $0
  i32.store
  local.get $1
  local.get $2
  i32.store offset=8
  local.get $1
  local.get $0
  i32.store offset=4
  local.get $1
 )
 (func $~lib/typedarray/Uint8Array.wrap@varargs (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  block $2of2
   block $1of2
    block $outOfRange
     global.get $~argumentsLength
     i32.const 1
     i32.sub
     br_table $1of2 $1of2 $2of2 $outOfRange
    end
    unreachable
   end
   i32.const -1
   local.set $1
  end
  local.get $0
  local.tee $2
  call $~lib/arraybuffer/ArrayBuffer#get:byteLength
  local.set $3
  local.get $1
  local.tee $0
  i32.const 0
  i32.lt_s
  if
   local.get $0
   i32.const -1
   i32.eq
   if (result i32)
    local.get $3
   else
    i32.const 1056
    i32.const 1360
    i32.const 1869
    i32.const 7
    call $~lib/builtins/abort
    unreachable
   end
   local.set $0
  else
   local.get $0
   local.get $3
   i32.gt_s
   if
    i32.const 1056
    i32.const 1360
    i32.const 1874
    i32.const 7
    call $~lib/builtins/abort
    unreachable
   end
  end
  i32.const 12
  i32.const 6
  call $~lib/rt/stub/__new
  local.tee $1
  local.get $2
  i32.store
  local.get $1
  local.get $0
  i32.store offset=8
  local.get $1
  local.get $2
  i32.store offset=4
  local.get $1
 )
 (func $~lib/typedarray/Float32Array#__get (param $0 i32) (param $1 i32) (result f32)
  local.get $1
  local.get $0
  i32.load offset=8
  i32.const 2
  i32.shr_u
  i32.ge_u
  if
   i32.const 1296
   i32.const 1360
   i32.const 1304
   i32.const 64
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  f32.load
 )
 (func $~lib/typedarray/Uint16Array#__get (param $0 i32) (param $1 i32) (result i32)
  local.get $1
  local.get $0
  i32.load offset=8
  i32.const 1
  i32.shr_u
  i32.ge_u
  if
   i32.const 1296
   i32.const 1360
   i32.const 594
   i32.const 64
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 1
  i32.shl
  i32.add
  i32.load16_u
 )
 (func $~lib/typedarray/Uint8Array#__get (param $0 i32) (param $1 i32) (result i32)
  local.get $1
  local.get $0
  i32.load offset=8
  i32.ge_u
  if
   i32.const 1296
   i32.const 1360
   i32.const 167
   i32.const 45
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.add
  i32.load8_u
 )
 (func $~lib/math/NativeMathf.cos (param $0 f32) (result f32)
  (local $1 f64)
  (local $2 i32)
  (local $3 i64)
  (local $4 i32)
  (local $5 f64)
  (local $6 i32)
  (local $7 i64)
  (local $8 i64)
  local.get $0
  i32.reinterpret_f32
  local.tee $2
  i32.const 31
  i32.shr_u
  local.set $4
  local.get $2
  i32.const 2147483647
  i32.and
  local.tee $2
  i32.const 1061752794
  i32.le_u
  if
   local.get $2
   i32.const 964689920
   i32.lt_u
   if
    f32.const 1
    return
   end
   local.get $0
   f64.promote_f32
   local.tee $1
   local.get $1
   f64.mul
   local.tee $1
   local.get $1
   f64.mul
   local.set $5
   local.get $1
   f64.const -0.499999997251031
   f64.mul
   f64.const 1
   f64.add
   local.get $5
   f64.const 0.04166662332373906
   f64.mul
   f64.add
   local.get $5
   local.get $1
   f64.mul
   local.get $1
   f64.const 2.439044879627741e-05
   f64.mul
   f64.const -0.001388676377460993
   f64.add
   f64.mul
   f64.add
   f32.demote_f64
   return
  end
  local.get $2
  i32.const 2139095040
  i32.ge_u
  if
   local.get $0
   local.get $0
   f32.sub
   return
  end
  block $~lib/math/rempio2f|inlined.0 (result i32)
   local.get $2
   i32.const 1305022427
   i32.lt_u
   if
    local.get $0
    f64.promote_f32
    local.get $0
    f64.promote_f32
    f64.const 0.6366197723675814
    f64.mul
    f64.nearest
    local.tee $1
    f64.const 1.5707963109016418
    f64.mul
    f64.sub
    local.get $1
    f64.const 1.5893254773528196e-08
    f64.mul
    f64.sub
    global.set $~lib/math/rempio2f_y
    local.get $1
    i32.trunc_sat_f64_s
    br $~lib/math/rempio2f|inlined.0
   end
   local.get $2
   i32.const 23
   i32.shr_s
   i32.const 152
   i32.sub
   local.tee $6
   i32.const 63
   i32.and
   i64.extend_i32_s
   local.set $7
   local.get $6
   i32.const 6
   i32.shr_s
   i32.const 3
   i32.shl
   i32.const 1408
   i32.add
   local.tee $6
   i64.load offset=8
   local.set $3
   f64.const 8.515303950216386e-20
   local.get $0
   f64.promote_f32
   f64.copysign
   local.get $2
   i32.const 8388607
   i32.and
   i32.const 8388608
   i32.or
   i64.extend_i32_s
   local.tee $8
   local.get $6
   i64.load
   local.get $7
   i64.shl
   local.get $3
   i64.const 64
   local.get $7
   i64.sub
   i64.shr_u
   i64.or
   i64.mul
   local.get $7
   i64.const 32
   i64.gt_u
   if (result i64)
    local.get $3
    local.get $7
    i64.const 32
    i64.sub
    i64.shl
    local.get $6
    i64.load offset=16
    i64.const 96
    local.get $7
    i64.sub
    i64.shr_u
    i64.or
   else
    local.get $3
    i64.const 32
    local.get $7
    i64.sub
    i64.shr_u
   end
   local.get $8
   i64.mul
   i64.const 32
   i64.shr_u
   i64.add
   local.tee $3
   i64.const 2
   i64.shl
   local.tee $7
   f64.convert_i64_s
   f64.mul
   global.set $~lib/math/rempio2f_y
   i32.const 0
   local.get $3
   i64.const 62
   i64.shr_u
   local.get $7
   i64.const 63
   i64.shr_u
   i64.add
   i32.wrap_i64
   local.tee $2
   i32.sub
   local.get $2
   local.get $4
   select
  end
  local.set $2
  global.get $~lib/math/rempio2f_y
  local.set $1
  local.get $2
  i32.const 1
  i32.and
  if (result f32)
   local.get $1
   local.get $1
   local.get $1
   f64.mul
   local.tee $5
   local.get $1
   f64.mul
   local.tee $1
   local.get $5
   f64.const 0.008333329385889463
   f64.mul
   f64.const -0.16666666641626524
   f64.add
   f64.mul
   f64.add
   local.get $1
   local.get $5
   local.get $5
   f64.mul
   f64.mul
   local.get $5
   f64.const 2.718311493989822e-06
   f64.mul
   f64.const -1.9839334836096632e-04
   f64.add
   f64.mul
   f64.add
   f32.demote_f64
  else
   local.get $1
   local.get $1
   f64.mul
   local.tee $1
   local.get $1
   f64.mul
   local.set $5
   local.get $1
   f64.const -0.499999997251031
   f64.mul
   f64.const 1
   f64.add
   local.get $5
   f64.const 0.04166662332373906
   f64.mul
   f64.add
   local.get $5
   local.get $1
   f64.mul
   local.get $1
   f64.const 2.439044879627741e-05
   f64.mul
   f64.const -0.001388676377460993
   f64.add
   f64.mul
   f64.add
   f32.demote_f64
  end
  local.tee $0
  f32.neg
  local.get $0
  local.get $2
  i32.const 1
  i32.add
  i32.const 2
  i32.and
  select
 )
 (func $~lib/math/NativeMathf.sin (param $0 f32) (result f32)
  (local $1 f64)
  (local $2 i32)
  (local $3 i64)
  (local $4 i32)
  (local $5 f64)
  (local $6 f64)
  (local $7 i32)
  (local $8 i64)
  (local $9 i64)
  local.get $0
  i32.reinterpret_f32
  local.tee $2
  i32.const 31
  i32.shr_u
  local.set $4
  local.get $2
  i32.const 2147483647
  i32.and
  local.tee $2
  i32.const 1061752794
  i32.le_u
  if
   local.get $2
   i32.const 964689920
   i32.lt_u
   if
    local.get $0
    return
   end
   local.get $0
   f64.promote_f32
   local.tee $5
   local.get $5
   f64.mul
   local.tee $6
   local.get $5
   f64.mul
   local.set $1
   local.get $5
   local.get $1
   local.get $6
   f64.const 0.008333329385889463
   f64.mul
   f64.const -0.16666666641626524
   f64.add
   f64.mul
   f64.add
   local.get $1
   local.get $6
   local.get $6
   f64.mul
   f64.mul
   local.get $6
   f64.const 2.718311493989822e-06
   f64.mul
   f64.const -1.9839334836096632e-04
   f64.add
   f64.mul
   f64.add
   f32.demote_f64
   return
  end
  local.get $2
  i32.const 2139095040
  i32.ge_u
  if
   local.get $0
   local.get $0
   f32.sub
   return
  end
  block $~lib/math/rempio2f|inlined.1 (result i32)
   local.get $2
   i32.const 1305022427
   i32.lt_u
   if
    local.get $0
    f64.promote_f32
    local.get $0
    f64.promote_f32
    f64.const 0.6366197723675814
    f64.mul
    f64.nearest
    local.tee $1
    f64.const 1.5707963109016418
    f64.mul
    f64.sub
    local.get $1
    f64.const 1.5893254773528196e-08
    f64.mul
    f64.sub
    global.set $~lib/math/rempio2f_y
    local.get $1
    i32.trunc_sat_f64_s
    br $~lib/math/rempio2f|inlined.1
   end
   local.get $2
   i32.const 23
   i32.shr_s
   i32.const 152
   i32.sub
   local.tee $7
   i32.const 63
   i32.and
   i64.extend_i32_s
   local.set $8
   local.get $7
   i32.const 6
   i32.shr_s
   i32.const 3
   i32.shl
   i32.const 1408
   i32.add
   local.tee $7
   i64.load offset=8
   local.set $3
   f64.const 8.515303950216386e-20
   local.get $0
   f64.promote_f32
   f64.copysign
   local.get $2
   i32.const 8388607
   i32.and
   i32.const 8388608
   i32.or
   i64.extend_i32_s
   local.tee $9
   local.get $7
   i64.load
   local.get $8
   i64.shl
   local.get $3
   i64.const 64
   local.get $8
   i64.sub
   i64.shr_u
   i64.or
   i64.mul
   local.get $8
   i64.const 32
   i64.gt_u
   if (result i64)
    local.get $3
    local.get $8
    i64.const 32
    i64.sub
    i64.shl
    local.get $7
    i64.load offset=16
    i64.const 96
    local.get $8
    i64.sub
    i64.shr_u
    i64.or
   else
    local.get $3
    i64.const 32
    local.get $8
    i64.sub
    i64.shr_u
   end
   local.get $9
   i64.mul
   i64.const 32
   i64.shr_u
   i64.add
   local.tee $3
   i64.const 2
   i64.shl
   local.tee $8
   f64.convert_i64_s
   f64.mul
   global.set $~lib/math/rempio2f_y
   i32.const 0
   local.get $3
   i64.const 62
   i64.shr_u
   local.get $8
   i64.const 63
   i64.shr_u
   i64.add
   i32.wrap_i64
   local.tee $2
   i32.sub
   local.get $2
   local.get $4
   select
  end
  local.set $2
  global.get $~lib/math/rempio2f_y
  local.set $1
  local.get $2
  i32.const 1
  i32.and
  if (result f32)
   local.get $1
   local.get $1
   f64.mul
   local.tee $1
   local.get $1
   f64.mul
   local.set $5
   local.get $1
   f64.const -0.499999997251031
   f64.mul
   f64.const 1
   f64.add
   local.get $5
   f64.const 0.04166662332373906
   f64.mul
   f64.add
   local.get $5
   local.get $1
   f64.mul
   local.get $1
   f64.const 2.439044879627741e-05
   f64.mul
   f64.const -0.001388676377460993
   f64.add
   f64.mul
   f64.add
   f32.demote_f64
  else
   local.get $1
   local.get $1
   local.get $1
   f64.mul
   local.tee $5
   local.get $1
   f64.mul
   local.tee $1
   local.get $5
   f64.const 0.008333329385889463
   f64.mul
   f64.const -0.16666666641626524
   f64.add
   f64.mul
   f64.add
   local.get $1
   local.get $5
   local.get $5
   f64.mul
   f64.mul
   local.get $5
   f64.const 2.718311493989822e-06
   f64.mul
   f64.const -1.9839334836096632e-04
   f64.add
   f64.mul
   f64.add
   f32.demote_f64
  end
  local.tee $0
  f32.neg
  local.get $0
  local.get $2
  i32.const 2
  i32.and
  select
 )
 (func $~lib/typedarray/Float32Array#__set (param $0 i32) (param $1 i32) (param $2 f32)
  local.get $1
  local.get $0
  i32.load offset=8
  i32.const 2
  i32.shr_u
  i32.ge_u
  if
   i32.const 1296
   i32.const 1360
   i32.const 1315
   i32.const 64
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  local.get $2
  f32.store
 )
 (func $assembly/rendering/generateVertexBuffer (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32) (param $5 i32) (param $6 i32) (param $7 i32) (param $8 i32) (param $9 i32) (result i32)
  (local $10 f32)
  (local $11 f32)
  (local $12 f32)
  (local $13 f32)
  (local $14 f32)
  (local $15 f32)
  (local $16 f32)
  (local $17 f32)
  (local $18 i32)
  (local $19 i32)
  (local $20 i32)
  (local $21 i32)
  (local $22 i32)
  (local $23 i32)
  (local $24 i32)
  (local $25 i32)
  (local $26 f32)
  i32.const 1
  global.set $~argumentsLength
  local.get $1
  call $~lib/typedarray/Float32Array.wrap@varargs
  local.set $25
  i32.const 1
  global.set $~argumentsLength
  local.get $2
  call $~lib/typedarray/Float32Array.wrap@varargs
  local.set $24
  i32.const 1
  global.set $~argumentsLength
  local.get $3
  call $~lib/typedarray/Float32Array.wrap@varargs
  local.set $23
  i32.const 1
  global.set $~argumentsLength
  local.get $4
  call $~lib/arraybuffer/ArrayBuffer#get:byteLength
  local.tee $2
  i32.const 1
  i32.and
  if
   i32.const 1056
   i32.const 1360
   i32.const 1865
   i32.const 9
   call $~lib/builtins/abort
   unreachable
  end
  i32.const 12
  i32.const 5
  call $~lib/rt/stub/__new
  local.tee $1
  local.get $4
  i32.store
  local.get $1
  local.get $2
  i32.store offset=8
  local.get $1
  local.get $4
  i32.store offset=4
  local.get $1
  local.set $4
  i32.const 1
  global.set $~argumentsLength
  local.get $5
  call $~lib/typedarray/Float32Array.wrap@varargs
  local.set $22
  i32.const 1
  global.set $~argumentsLength
  local.get $6
  call $~lib/typedarray/Uint8Array.wrap@varargs
  local.set $21
  i32.const 1
  global.set $~argumentsLength
  local.get $7
  call $~lib/typedarray/Uint8Array.wrap@varargs
  local.set $20
  i32.const 1
  global.set $~argumentsLength
  local.get $8
  call $~lib/typedarray/Uint8Array.wrap@varargs
  local.set $19
  i32.const 1
  global.set $~argumentsLength
  local.get $9
  call $~lib/typedarray/Float32Array.wrap@varargs
  local.set $18
  i32.const 0
  local.set $1
  local.get $0
  i32.const -4
  i32.and
  local.set $2
  i32.const 0
  local.set $3
  loop $for-loop|0
   local.get $2
   local.get $3
   i32.gt_s
   if
    local.get $25
    local.get $3
    call $~lib/typedarray/Float32Array#__get
    local.set $17
    local.get $24
    local.get $3
    call $~lib/typedarray/Float32Array#__get
    local.set $16
    local.get $23
    local.get $3
    call $~lib/typedarray/Float32Array#__get
    local.set $12
    local.get $22
    local.get $3
    call $~lib/typedarray/Float32Array#__get
    local.set $11
    local.get $4
    local.get $3
    call $~lib/typedarray/Uint16Array#__get
    local.set $8
    local.get $21
    local.get $3
    call $~lib/typedarray/Uint8Array#__get
    local.set $7
    local.get $20
    local.get $3
    call $~lib/typedarray/Uint8Array#__get
    local.set $6
    local.get $19
    local.get $3
    call $~lib/typedarray/Uint8Array#__get
    local.set $5
    local.get $18
    local.get $3
    call $~lib/typedarray/Float32Array#__get
    local.set $13
    f32.const 1
    local.set $26
    local.get $8
    if (result f32)
     local.get $8
     f32.convert_i32_u
     f32.const 3.1415927410125732
     f32.mul
     f32.const 180
     f32.div
     local.tee $10
     call $~lib/math/NativeMathf.cos
     local.set $26
     local.get $10
     call $~lib/math/NativeMathf.sin
    else
     f32.const 0
    end
    local.set $15
    local.get $12
    local.get $11
    f32.mul
    f32.const 0.5
    f32.mul
    local.tee $12
    f32.neg
    local.set $14
    local.get $12
    f32.neg
    local.set $10
    local.get $8
    if
     local.get $14
     local.get $15
     f32.mul
     local.get $10
     local.get $26
     f32.mul
     f32.add
     local.set $11
     local.get $14
     local.get $26
     f32.mul
     local.get $10
     local.get $15
     f32.mul
     f32.sub
     local.set $14
     local.get $11
     local.set $10
    end
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    local.get $17
    local.get $14
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 1
    i32.add
    local.get $16
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 2
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 3
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 4
    i32.add
    local.get $13
    f32.const 255
    f32.mul
    i32.trunc_sat_f32_u
    i32.const 255
    i32.and
    local.get $7
    i32.const 24
    i32.shl
    local.get $6
    i32.const 16
    i32.shl
    i32.or
    local.get $5
    i32.const 8
    i32.shl
    i32.or
    i32.or
    local.tee $5
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $12
    local.tee $10
    f32.neg
    local.set $14
    local.get $8
    if
     local.get $10
     local.get $26
     f32.mul
     local.get $14
     local.get $15
     f32.mul
     f32.sub
     local.set $10
     local.get $12
     local.get $15
     f32.mul
     local.get $14
     local.get $26
     f32.mul
     f32.add
     local.set $14
    end
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 5
    i32.add
    local.get $17
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 6
    i32.add
    local.get $16
    local.get $14
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 7
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 8
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 9
    i32.add
    local.get $5
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $12
    f32.neg
    local.set $13
    local.get $12
    local.set $11
    local.get $8
    if
     local.get $13
     local.get $15
     f32.mul
     local.get $11
     local.get $26
     f32.mul
     f32.add
     local.set $11
     local.get $13
     local.get $26
     f32.mul
     local.get $12
     local.get $15
     f32.mul
     f32.sub
     local.set $13
    end
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 10
    i32.add
    local.get $17
    local.get $13
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 11
    i32.add
    local.get $16
    local.get $11
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 12
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 13
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 14
    i32.add
    local.get $5
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 15
    i32.add
    local.get $17
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 16
    i32.add
    local.get $16
    local.get $14
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 17
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 18
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 19
    i32.add
    local.get $5
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $12
    local.set $10
    local.get $8
    if (result f32)
     local.get $10
     local.get $26
     f32.mul
     local.tee $14
     local.get $10
     local.get $15
     f32.mul
     local.tee $12
     f32.sub
     local.set $10
     local.get $12
     local.get $14
     f32.add
    else
     local.get $10
    end
    local.set $12
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 20
    i32.add
    local.get $17
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 21
    i32.add
    local.get $16
    local.get $12
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 22
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 23
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 24
    i32.add
    local.get $5
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 25
    i32.add
    local.get $17
    local.get $13
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 26
    i32.add
    local.get $16
    local.get $11
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 27
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 28
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 29
    i32.add
    local.get $5
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $25
    local.get $3
    i32.const 1
    i32.add
    local.tee $9
    call $~lib/typedarray/Float32Array#__get
    local.set $17
    local.get $24
    local.get $9
    call $~lib/typedarray/Float32Array#__get
    local.set $16
    local.get $23
    local.get $9
    call $~lib/typedarray/Float32Array#__get
    local.set $12
    local.get $22
    local.get $9
    call $~lib/typedarray/Float32Array#__get
    local.set $11
    local.get $4
    local.get $9
    call $~lib/typedarray/Uint16Array#__get
    local.set $8
    local.get $21
    local.get $9
    call $~lib/typedarray/Uint8Array#__get
    local.set $7
    local.get $20
    local.get $9
    call $~lib/typedarray/Uint8Array#__get
    local.set $6
    local.get $19
    local.get $9
    call $~lib/typedarray/Uint8Array#__get
    local.set $5
    local.get $18
    local.get $9
    call $~lib/typedarray/Float32Array#__get
    local.set $13
    f32.const 1
    local.set $26
    local.get $8
    if (result f32)
     local.get $8
     f32.convert_i32_u
     f32.const 3.1415927410125732
     f32.mul
     f32.const 180
     f32.div
     local.tee $10
     call $~lib/math/NativeMathf.cos
     local.set $26
     local.get $10
     call $~lib/math/NativeMathf.sin
    else
     f32.const 0
    end
    local.set $15
    local.get $12
    local.get $11
    f32.mul
    f32.const 0.5
    f32.mul
    local.tee $12
    f32.neg
    local.set $14
    local.get $12
    f32.neg
    local.set $10
    local.get $8
    if
     local.get $14
     local.get $15
     f32.mul
     local.get $10
     local.get $26
     f32.mul
     f32.add
     local.set $11
     local.get $14
     local.get $26
     f32.mul
     local.get $10
     local.get $15
     f32.mul
     f32.sub
     local.set $14
     local.get $11
     local.set $10
    end
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 30
    i32.add
    local.tee $9
    local.get $17
    local.get $14
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 1
    i32.add
    local.get $16
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 2
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 3
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 4
    i32.add
    local.get $13
    f32.const 255
    f32.mul
    i32.trunc_sat_f32_u
    i32.const 255
    i32.and
    local.get $7
    i32.const 24
    i32.shl
    local.get $6
    i32.const 16
    i32.shl
    i32.or
    local.get $5
    i32.const 8
    i32.shl
    i32.or
    i32.or
    local.tee $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $12
    local.tee $10
    f32.neg
    local.set $14
    local.get $8
    if
     local.get $10
     local.get $26
     f32.mul
     local.get $14
     local.get $15
     f32.mul
     f32.sub
     local.set $10
     local.get $12
     local.get $15
     f32.mul
     local.get $14
     local.get $26
     f32.mul
     f32.add
     local.set $14
    end
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 5
    i32.add
    local.get $17
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 6
    i32.add
    local.get $16
    local.get $14
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 7
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 8
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 9
    i32.add
    local.get $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $12
    f32.neg
    local.set $13
    local.get $12
    local.set $11
    local.get $8
    if
     local.get $13
     local.get $15
     f32.mul
     local.get $11
     local.get $26
     f32.mul
     f32.add
     local.set $11
     local.get $13
     local.get $26
     f32.mul
     local.get $12
     local.get $15
     f32.mul
     f32.sub
     local.set $13
    end
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 10
    i32.add
    local.get $17
    local.get $13
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 11
    i32.add
    local.get $16
    local.get $11
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 12
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 13
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 14
    i32.add
    local.get $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 15
    i32.add
    local.get $17
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 16
    i32.add
    local.get $16
    local.get $14
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 17
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 18
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 19
    i32.add
    local.get $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $12
    local.set $10
    local.get $8
    if (result f32)
     local.get $10
     local.get $26
     f32.mul
     local.tee $14
     local.get $10
     local.get $15
     f32.mul
     local.tee $12
     f32.sub
     local.set $10
     local.get $12
     local.get $14
     f32.add
    else
     local.get $10
    end
    local.set $12
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 20
    i32.add
    local.get $17
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 21
    i32.add
    local.get $16
    local.get $12
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 22
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 23
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 24
    i32.add
    local.get $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 25
    i32.add
    local.get $17
    local.get $13
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 26
    i32.add
    local.get $16
    local.get $11
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 27
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 28
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 29
    i32.add
    local.get $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $25
    local.get $3
    i32.const 2
    i32.add
    local.tee $8
    call $~lib/typedarray/Float32Array#__get
    local.set $17
    local.get $24
    local.get $8
    call $~lib/typedarray/Float32Array#__get
    local.set $16
    local.get $23
    local.get $8
    call $~lib/typedarray/Float32Array#__get
    local.set $12
    local.get $22
    local.get $8
    call $~lib/typedarray/Float32Array#__get
    local.set $11
    local.get $4
    local.get $8
    call $~lib/typedarray/Uint16Array#__get
    local.set $7
    local.get $21
    local.get $8
    call $~lib/typedarray/Uint8Array#__get
    local.set $6
    local.get $20
    local.get $8
    call $~lib/typedarray/Uint8Array#__get
    local.set $5
    local.get $19
    local.get $8
    call $~lib/typedarray/Uint8Array#__get
    local.set $1
    local.get $18
    local.get $8
    call $~lib/typedarray/Float32Array#__get
    local.set $13
    f32.const 1
    local.set $26
    local.get $7
    if (result f32)
     local.get $7
     f32.convert_i32_u
     f32.const 3.1415927410125732
     f32.mul
     f32.const 180
     f32.div
     local.tee $10
     call $~lib/math/NativeMathf.cos
     local.set $26
     local.get $10
     call $~lib/math/NativeMathf.sin
    else
     f32.const 0
    end
    local.set $15
    local.get $12
    local.get $11
    f32.mul
    f32.const 0.5
    f32.mul
    local.tee $12
    f32.neg
    local.set $14
    local.get $12
    f32.neg
    local.set $10
    local.get $7
    if
     local.get $14
     local.get $15
     f32.mul
     local.get $10
     local.get $26
     f32.mul
     f32.add
     local.set $11
     local.get $14
     local.get $26
     f32.mul
     local.get $10
     local.get $15
     f32.mul
     f32.sub
     local.set $14
     local.get $11
     local.set $10
    end
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 30
    i32.add
    local.tee $9
    local.get $17
    local.get $14
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 1
    i32.add
    local.get $16
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 2
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 3
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 4
    i32.add
    local.get $13
    f32.const 255
    f32.mul
    i32.trunc_sat_f32_u
    i32.const 255
    i32.and
    local.get $6
    i32.const 24
    i32.shl
    local.get $5
    i32.const 16
    i32.shl
    i32.or
    local.get $1
    i32.const 8
    i32.shl
    i32.or
    i32.or
    local.tee $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $12
    local.tee $10
    f32.neg
    local.set $14
    local.get $7
    if
     local.get $10
     local.get $26
     f32.mul
     local.get $14
     local.get $15
     f32.mul
     f32.sub
     local.set $10
     local.get $12
     local.get $15
     f32.mul
     local.get $14
     local.get $26
     f32.mul
     f32.add
     local.set $14
    end
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 5
    i32.add
    local.get $17
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 6
    i32.add
    local.get $16
    local.get $14
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 7
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 8
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 9
    i32.add
    local.get $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $12
    f32.neg
    local.set $13
    local.get $12
    local.set $11
    local.get $7
    if
     local.get $13
     local.get $15
     f32.mul
     local.get $11
     local.get $26
     f32.mul
     f32.add
     local.set $11
     local.get $13
     local.get $26
     f32.mul
     local.get $12
     local.get $15
     f32.mul
     f32.sub
     local.set $13
    end
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 10
    i32.add
    local.get $17
    local.get $13
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 11
    i32.add
    local.get $16
    local.get $11
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 12
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 13
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 14
    i32.add
    local.get $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 15
    i32.add
    local.get $17
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 16
    i32.add
    local.get $16
    local.get $14
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 17
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 18
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 19
    i32.add
    local.get $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $12
    local.set $10
    local.get $7
    if (result f32)
     local.get $10
     local.get $26
     f32.mul
     local.tee $14
     local.get $10
     local.get $15
     f32.mul
     local.tee $12
     f32.sub
     local.set $10
     local.get $12
     local.get $14
     f32.add
    else
     local.get $10
    end
    local.set $12
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 20
    i32.add
    local.get $17
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 21
    i32.add
    local.get $16
    local.get $12
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 22
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 23
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 24
    i32.add
    local.get $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 25
    i32.add
    local.get $17
    local.get $13
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 26
    i32.add
    local.get $16
    local.get $11
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 27
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 28
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 29
    i32.add
    local.get $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $25
    local.get $3
    i32.const 3
    i32.add
    local.tee $5
    call $~lib/typedarray/Float32Array#__get
    local.set $17
    local.get $24
    local.get $5
    call $~lib/typedarray/Float32Array#__get
    local.set $16
    local.get $23
    local.get $5
    call $~lib/typedarray/Float32Array#__get
    local.set $12
    local.get $22
    local.get $5
    call $~lib/typedarray/Float32Array#__get
    local.set $11
    local.get $4
    local.get $5
    call $~lib/typedarray/Uint16Array#__get
    local.set $8
    local.get $21
    local.get $5
    call $~lib/typedarray/Uint8Array#__get
    local.set $7
    local.get $20
    local.get $5
    call $~lib/typedarray/Uint8Array#__get
    local.set $6
    local.get $19
    local.get $5
    call $~lib/typedarray/Uint8Array#__get
    local.set $1
    local.get $18
    local.get $5
    call $~lib/typedarray/Float32Array#__get
    local.set $13
    f32.const 1
    local.set $26
    local.get $8
    if (result f32)
     local.get $8
     f32.convert_i32_u
     f32.const 3.1415927410125732
     f32.mul
     f32.const 180
     f32.div
     local.tee $10
     call $~lib/math/NativeMathf.cos
     local.set $26
     local.get $10
     call $~lib/math/NativeMathf.sin
    else
     f32.const 0
    end
    local.set $15
    local.get $12
    local.get $11
    f32.mul
    f32.const 0.5
    f32.mul
    local.tee $12
    f32.neg
    local.set $14
    local.get $12
    f32.neg
    local.set $10
    local.get $8
    if
     local.get $14
     local.get $15
     f32.mul
     local.get $10
     local.get $26
     f32.mul
     f32.add
     local.set $11
     local.get $14
     local.get $26
     f32.mul
     local.get $10
     local.get $15
     f32.mul
     f32.sub
     local.set $14
     local.get $11
     local.set $10
    end
    global.get $assembly/rendering/vertexBuffer
    local.get $9
    i32.const 30
    i32.add
    local.tee $5
    local.get $17
    local.get $14
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 1
    i32.add
    local.get $16
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 2
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 3
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 4
    i32.add
    local.get $13
    f32.const 255
    f32.mul
    i32.trunc_sat_f32_u
    i32.const 255
    i32.and
    local.get $7
    i32.const 24
    i32.shl
    local.get $6
    i32.const 16
    i32.shl
    i32.or
    local.get $1
    i32.const 8
    i32.shl
    i32.or
    i32.or
    local.tee $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $12
    local.tee $10
    f32.neg
    local.set $14
    local.get $8
    if
     local.get $10
     local.get $26
     f32.mul
     local.get $14
     local.get $15
     f32.mul
     f32.sub
     local.set $10
     local.get $12
     local.get $15
     f32.mul
     local.get $14
     local.get $26
     f32.mul
     f32.add
     local.set $14
    end
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 5
    i32.add
    local.get $17
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 6
    i32.add
    local.get $16
    local.get $14
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 7
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 8
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 9
    i32.add
    local.get $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $12
    f32.neg
    local.set $13
    local.get $12
    local.set $11
    local.get $8
    if
     local.get $13
     local.get $15
     f32.mul
     local.get $11
     local.get $26
     f32.mul
     f32.add
     local.set $11
     local.get $13
     local.get $26
     f32.mul
     local.get $12
     local.get $15
     f32.mul
     f32.sub
     local.set $13
    end
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 10
    i32.add
    local.get $17
    local.get $13
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 11
    i32.add
    local.get $16
    local.get $11
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 12
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 13
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 14
    i32.add
    local.get $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 15
    i32.add
    local.get $17
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 16
    i32.add
    local.get $16
    local.get $14
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 17
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 18
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 19
    i32.add
    local.get $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $12
    local.set $10
    local.get $8
    if (result f32)
     local.get $10
     local.get $26
     f32.mul
     local.tee $14
     local.get $10
     local.get $15
     f32.mul
     local.tee $12
     f32.sub
     local.set $10
     local.get $12
     local.get $14
     f32.add
    else
     local.get $10
    end
    local.set $12
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 20
    i32.add
    local.get $17
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 21
    i32.add
    local.get $16
    local.get $12
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 22
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 23
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 24
    i32.add
    local.get $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 25
    i32.add
    local.get $17
    local.get $13
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 26
    i32.add
    local.get $16
    local.get $11
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 27
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 28
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $5
    i32.const 29
    i32.add
    local.get $1
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $5
    i32.const 30
    i32.add
    local.set $1
    local.get $3
    i32.const 4
    i32.add
    local.set $3
    br $for-loop|0
   end
  end
  loop $for-loop|1
   local.get $0
   local.get $2
   i32.gt_s
   if
    local.get $25
    local.get $2
    call $~lib/typedarray/Float32Array#__get
    local.set $17
    local.get $24
    local.get $2
    call $~lib/typedarray/Float32Array#__get
    local.set $16
    local.get $23
    local.get $2
    call $~lib/typedarray/Float32Array#__get
    local.set $12
    local.get $22
    local.get $2
    call $~lib/typedarray/Float32Array#__get
    local.set $11
    local.get $4
    local.get $2
    call $~lib/typedarray/Uint16Array#__get
    local.set $7
    local.get $21
    local.get $2
    call $~lib/typedarray/Uint8Array#__get
    local.set $6
    local.get $20
    local.get $2
    call $~lib/typedarray/Uint8Array#__get
    local.set $5
    local.get $19
    local.get $2
    call $~lib/typedarray/Uint8Array#__get
    local.set $3
    local.get $18
    local.get $2
    call $~lib/typedarray/Float32Array#__get
    local.set $13
    f32.const 1
    local.set $26
    local.get $7
    if (result f32)
     local.get $7
     f32.convert_i32_u
     f32.const 3.1415927410125732
     f32.mul
     f32.const 180
     f32.div
     local.tee $10
     call $~lib/math/NativeMathf.cos
     local.set $26
     local.get $10
     call $~lib/math/NativeMathf.sin
    else
     f32.const 0
    end
    local.set $15
    local.get $12
    local.get $11
    f32.mul
    f32.const 0.5
    f32.mul
    local.tee $12
    f32.neg
    local.set $14
    local.get $12
    f32.neg
    local.set $10
    local.get $7
    if
     local.get $14
     local.get $15
     f32.mul
     local.get $10
     local.get $26
     f32.mul
     f32.add
     local.set $11
     local.get $14
     local.get $26
     f32.mul
     local.get $10
     local.get $15
     f32.mul
     f32.sub
     local.set $14
     local.get $11
     local.set $10
    end
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    local.get $17
    local.get $14
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 1
    i32.add
    local.get $16
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 2
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 3
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 4
    i32.add
    local.get $13
    f32.const 255
    f32.mul
    i32.trunc_sat_f32_u
    i32.const 255
    i32.and
    local.get $6
    i32.const 24
    i32.shl
    local.get $5
    i32.const 16
    i32.shl
    i32.or
    local.get $3
    i32.const 8
    i32.shl
    i32.or
    i32.or
    local.tee $3
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $12
    local.tee $10
    f32.neg
    local.set $14
    local.get $7
    if
     local.get $10
     local.get $26
     f32.mul
     local.get $14
     local.get $15
     f32.mul
     f32.sub
     local.set $10
     local.get $12
     local.get $15
     f32.mul
     local.get $14
     local.get $26
     f32.mul
     f32.add
     local.set $14
    end
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 5
    i32.add
    local.get $17
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 6
    i32.add
    local.get $16
    local.get $14
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 7
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 8
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 9
    i32.add
    local.get $3
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $12
    f32.neg
    local.set $13
    local.get $12
    local.set $11
    local.get $7
    if
     local.get $13
     local.get $15
     f32.mul
     local.get $11
     local.get $26
     f32.mul
     f32.add
     local.set $11
     local.get $13
     local.get $26
     f32.mul
     local.get $12
     local.get $15
     f32.mul
     f32.sub
     local.set $13
    end
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 10
    i32.add
    local.get $17
    local.get $13
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 11
    i32.add
    local.get $16
    local.get $11
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 12
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 13
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 14
    i32.add
    local.get $3
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 15
    i32.add
    local.get $17
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 16
    i32.add
    local.get $16
    local.get $14
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 17
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 18
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 19
    i32.add
    local.get $3
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $12
    local.set $10
    local.get $7
    if (result f32)
     local.get $10
     local.get $26
     f32.mul
     local.tee $14
     local.get $10
     local.get $15
     f32.mul
     local.tee $12
     f32.sub
     local.set $10
     local.get $12
     local.get $14
     f32.add
    else
     local.get $10
    end
    local.set $12
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 20
    i32.add
    local.get $17
    local.get $10
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 21
    i32.add
    local.get $16
    local.get $12
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 22
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 23
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 24
    i32.add
    local.get $3
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 25
    i32.add
    local.get $17
    local.get $13
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 26
    i32.add
    local.get $16
    local.get $11
    f32.add
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 27
    i32.add
    f32.const 0
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 28
    i32.add
    f32.const 1
    call $~lib/typedarray/Float32Array#__set
    global.get $assembly/rendering/vertexBuffer
    local.get $1
    i32.const 29
    i32.add
    local.get $3
    f32.convert_i32_u
    call $~lib/typedarray/Float32Array#__set
    local.get $1
    i32.const 30
    i32.add
    local.set $1
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|1
   end
  end
  local.get $1
 )
 (func $assembly/rendering/getVertexBufferPtr (result i32)
  global.get $assembly/rendering/vertexBuffer
 )
 (func $assembly/rendering/getVertexBufferSize (result i32)
  global.get $assembly/rendering/vertexBuffer
  i32.load offset=8
  i32.const -4
  i32.and
 )
 (func $~lib/rt/stub/__pin (param $0 i32) (result i32)
  local.get $0
 )
 (func $~lib/rt/stub/__unpin (param $0 i32)
 )
 (func $~lib/rt/stub/__collect
 )
 (func $~start
  i32.const 1484
  global.set $~lib/rt/stub/offset
  i32.const 0
  call $~lib/typedarray/Float32Array#constructor
  global.set $assembly/rendering/vertexBuffer
 )
)
